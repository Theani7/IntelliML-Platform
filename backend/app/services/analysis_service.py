import logging
import json
from pathlib import Path

from app.services.data_service import DataService
from app.core.groq_client import groq_client
from ml_engine.engines.data_analyzer import DataAnalyzer

logger = logging.getLogger(__name__)

class AnalysisService:
    """
    Service for data analysis orchestration
    Combines automated analysis with AI-generated insights
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AnalysisService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, '_initialized'):
            self.data_service = DataService()
            self.analyzer = DataAnalyzer()
            self.groq = groq_client
            self._initialized = True
    
    def analyze_dataset(self) -> dict:
        """
        Perform complete dataset analysis with AI insights
        """
        try:
            logger.info("Starting dataset analysis")
            
            # Get current dataframe
            df = self.data_service.get_dataframe()
            logger.info(f"Got dataframe with shape: {df.shape}")
            
            # Perform automated analysis
            analysis = self.analyzer.analyze(df)
            logger.info("Analysis complete")
            
            # Generate AI insights
            insights = self._generate_ai_insights(analysis)
            logger.info("AI insights generated")
            
            return {
                "analysis": analysis,
                "ai_insights": insights,
                "success": True,
            }
            
        except Exception as e:
            logger.error(f"Analysis error: {str(e)}", exc_info=True)
            raise
    
    def _generate_ai_insights(self, analysis: dict) -> str:
        """Generate natural language insights using LLM"""
        try:
            prompt = f"""You are a data scientist analyzing a dataset. Based on the statistical analysis below, provide clear, actionable insights.

Dataset Analysis:
- Rows: {analysis['basic_info']['num_rows']}
- Columns: {analysis['basic_info']['num_columns']}
- Missing Values: {analysis['missing_values']['total_missing']}
- Duplicate Rows: {analysis['basic_info']['duplicate_rows']}
- Data Quality Score: {analysis['data_quality']['quality_score']}/100

Issues Found:
{json.dumps(analysis['data_quality']['issues'], indent=2)}

Recommendations:
{json.dumps(analysis['recommendations'], indent=2)}

Provide a brief summary (3-5 sentences) covering:
1. Overall data quality
2. Key issues to address
3. What to do before training models

Be conversational and helpful."""

            messages = [{"role": "user", "content": prompt}]
            insights = self.groq.chat_completion(messages, temperature=0.7)
            
            return insights if insights else "Analysis completed successfully."
            
        except Exception as e:
            logger.error(f"AI insights generation error: {str(e)}")
            return "Analysis completed. Unable to generate AI insights at this time."