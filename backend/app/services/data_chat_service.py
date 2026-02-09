"""
AI Data Chat Service
Allows users to have conversations with an LLM about their dataset.
The LLM can generate and execute Python code to answer questions.
"""

import pandas as pd
import numpy as np
from io import StringIO
import sys
import traceback
from typing import Dict, Any, List, Optional
import logging
import json
import re
import base64
from io import BytesIO

from app.core.groq_client import groq_client
from app.services.data_service import DataService

logger = logging.getLogger(__name__)


class DataChatService:
    """
    AI-powered chat service for data analysis.
    Users can ask questions and the system:
    1. Generates Python code to answer
    2. Executes the code safely
    3. Returns results and visualizations
    """
    
    def __init__(self):
        self.data_service = DataService()
        self.groq = groq_client
        self.conversation_history: List[Dict[str, str]] = []
        
    def chat(self, user_message: str) -> Dict[str, Any]:
        """
        Process a user message about the dataset.
        
        Args:
            user_message: The user's question or request
            
        Returns:
            Dict with response, code, output, and optional visualization
        """
        try:
            # Get current dataset
            df = self.data_service.get_dataframe()
            
            # Build context about the dataset
            dataset_context = self._build_dataset_context(df)
            
            # Add to conversation
            self.conversation_history.append({"role": "user", "content": user_message})
            
            # Generate response with code
            response = self._generate_response(user_message, dataset_context)
            
            # Add assistant response to history
            self.conversation_history.append({"role": "assistant", "content": response['text']})
            
            return response
            
        except ValueError as e:
            return {
                "text": str(e),
                "code": None,
                "output": None,
                "visualization": None,
                "error": True
            }
        except Exception as e:
            logger.error(f"Chat error: {str(e)}", exc_info=True)
            return {
                "text": f"Sorry, I encountered an error: {str(e)}",
                "code": None,
                "output": None,
                "visualization": None,
                "error": True
            }
    
    def _build_dataset_context(self, df: pd.DataFrame) -> str:
        """Build context string describing the dataset"""
        # Truncate to save tokens
        max_cols = 20
        max_rows_sample = 5
        
        # Column info
        cols = df.columns.tolist()
        if len(cols) > max_cols:
            col_info = ', '.join(cols[:max_cols]) + f"... (+{len(cols)-max_cols} more)"
        else:
            col_info = ', '.join(cols)
            
        # Data types (summary)
        dtype_counts = df.dtypes.value_counts().to_string()
        
        # Sample data
        sample_data = df.head(max_rows_sample).to_markdown(index=False, numalign="left", stralign="left")
        
        # Statistics
        # Only describe numeric columns to save space, and limit to top columns
        numeric_df = df.select_dtypes(include=[np.number])
        if not numeric_df.empty:
            stats = numeric_df.iloc[:, :max_cols].describe().to_markdown(numalign="left", stralign="left")
        else:
            stats = "No numeric columns."

        context = f"""Dataset Information:
- Shape: {df.shape[0]} rows, {df.shape[1]} columns
- Columns: {col_info}
- Data Types Summary:
{dtype_counts}

Sample Data (First {max_rows_sample} rows):
{sample_data}

Statistics (Top {max_cols} numeric columns):
{stats}
"""
        return context
    
    def _generate_response(self, user_message: str, dataset_context: str) -> Dict[str, Any]:
        """Generate LLM response with optional code execution"""
        
        system_prompt = """You are an AI data analyst assistant. The user has uploaded a dataset and wants to analyze it.

When answering questions:
1. If the question requires data analysis, generate Python code wrapped in ```python``` blocks
2. Use the variable `df` which contains the pandas DataFrame
3. Print results clearly using print() statements
4. For visualizations, use matplotlib and save to base64:
   - import matplotlib.pyplot as plt
   - Create the plot
   - Save with: plt.savefig(buf, format='png'); buf.seek(0); print("PLOT:" + base64.b64encode(buf.read()).decode())

Always be helpful and explain your findings in plain language.

IMPORTANT: 
- The dataframe is already loaded as `df`
- numpy is available as `np`
- pandas is available as `pd`
- Always use print() to show results"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"""Dataset Context:
{dataset_context}

User Question: {user_message}

Please analyze the data and provide:
1. A clear explanation
2. Python code if needed (wrapped in ```python```)
3. Suggested visualizations if relevant"""}
        ]
        
        # Add conversation history (limited to last 10 messages)
        for msg in self.conversation_history[-10:]:
            messages.append(msg)
        
        # Get LLM response
        llm_response = self.groq.chat_completion(messages, max_tokens=2048)
        
        if not llm_response:
            return {
                "text": "I'm having trouble connecting to the AI service. Please try again.",
                "code": None,
                "output": None,
                "visualization": None,
                "error": True
            }
        
        # Extract code blocks if any
        code_blocks = self._extract_code_blocks(llm_response)
        
        # Execute code and get results
        code_output = None
        visualization = None
        
        if code_blocks:
            df = self.data_service.get_dataframe()
            code_output, visualization = self._execute_code(code_blocks[0], df)
        
        return {
            "text": llm_response,
            "code": code_blocks[0] if code_blocks else None,
            "output": code_output,
            "visualization": visualization,
            "error": False
        }
    
    def _extract_code_blocks(self, text: str) -> List[str]:
        """Extract Python code blocks from markdown text"""
        pattern = r'```python\s*(.*?)\s*```'
        matches = re.findall(pattern, text, re.DOTALL)
        return matches
    
    def _execute_code(self, code: str, df: pd.DataFrame) -> tuple:
        """Safely execute Python code and capture output"""
        # Capture stdout
        old_stdout = sys.stdout
        sys.stdout = StringIO()
        
        visualization = None
        
        try:
            # Create safe execution environment
            import matplotlib
            matplotlib.use('Agg')
            import matplotlib.pyplot as plt
            
            local_vars = {
                'df': df.copy(),
                'pd': pd,
                'np': np,
                'plt': plt,
                'base64': base64,
                'BytesIO': BytesIO,
            }
            
            # Execute code
            exec(code, {"__builtins__": __builtins__}, local_vars)
            
            # Get output
            output = sys.stdout.getvalue()
            
            # Check for plot data in output (legacy method)
            if "PLOT:" in output:
                lines = output.split('\n')
                for line in lines:
                    if line.startswith("PLOT:"):
                        visualization = "data:image/png;base64," + line[5:]
                        output = output.replace(line, "[Visualization generated]")
            
            # Auto-capture any open matplotlib figures (new method)
            if visualization is None and plt.get_fignums():
                buf = BytesIO()
                plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='white', edgecolor='none')
                buf.seek(0)
                img_base64 = base64.b64encode(buf.read()).decode('utf-8')
                visualization = f"data:image/png;base64,{img_base64}"
                buf.close()
            
            return output.strip(), visualization
            
        except Exception as e:
            error_msg = f"Code execution error: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            return error_msg, None
            
        finally:
            sys.stdout = old_stdout
            plt.close('all')
    
    def get_visualization_suggestions(self) -> List[Dict[str, str]]:
        """Suggest appropriate visualizations based on dataset analysis"""
        try:
            df = self.data_service.get_dataframe()
            suggestions = []
            
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
            
            # Distribution plots for numeric columns
            if numeric_cols:
                suggestions.append({
                    "type": "histogram",
                    "title": "Distribution Analysis",
                    "description": f"View distributions of numeric columns: {', '.join(numeric_cols[:3])}",
                    "code": f"df[{numeric_cols[:3]}].hist(figsize=(12, 4))\nplt.tight_layout()"
                })
            
            # Correlation heatmap
            if len(numeric_cols) >= 2:
                suggestions.append({
                    "type": "heatmap",
                    "title": "Correlation Heatmap",
                    "description": "See relationships between numeric variables",
                    "code": "import seaborn as sns\nsns.heatmap(df.select_dtypes(include=[np.number]).corr(), annot=True, cmap='coolwarm')"
                })
            
            # Categorical value counts
            if categorical_cols:
                col = categorical_cols[0]
                suggestions.append({
                    "type": "bar",
                    "title": f"Value Counts: {col}",
                    "description": f"Distribution of categories in {col}",
                    "code": f"df['{col}'].value_counts().plot(kind='bar')\nplt.xlabel('{col}')\nplt.ylabel('Count')"
                })
            
            # Box plots for outliers
            if numeric_cols:
                suggestions.append({
                    "type": "boxplot",
                    "title": "Outlier Detection",
                    "description": "Box plots to identify outliers in numeric columns",
                    "code": f"df[{numeric_cols[:4]}].boxplot(figsize=(10, 6))"
                })
            
            # Scatter plot for correlation
            if len(numeric_cols) >= 2:
                suggestions.append({
                    "type": "scatter",
                    "title": f"Scatter: {numeric_cols[0]} vs {numeric_cols[1]}",
                    "description": "Explore relationship between two numeric variables",
                    "code": f"plt.scatter(df['{numeric_cols[0]}'], df['{numeric_cols[1]}'], alpha=0.5)\nplt.xlabel('{numeric_cols[0]}')\nplt.ylabel('{numeric_cols[1]}')"
                })
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Suggestion error: {str(e)}")
            return []
    
    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []


# Singleton instance
data_chat_service = DataChatService()
