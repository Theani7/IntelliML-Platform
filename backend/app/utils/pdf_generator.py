from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from io import BytesIO
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg') # Non-interactive backend
from matplotlib.figure import Figure
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
import seaborn as sns

def generate_plot_buffer(fig):
    """Save matplotlib figure to BytesIO buffer"""
    buf = BytesIO()
    FigureCanvas(fig).print_png(buf)
    buf.seek(0)
    return buf

def generate_eda_pdf(df: pd.DataFrame, analysis_results: dict) -> BytesIO:
    """
    Generate a PDF report for Exploratory Data Analysis with Charts.
    Returns a BytesIO object containing the PDF.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # --- Title ---
    title_style = styles['Title']
    story.append(Paragraph("EDA Report", title_style))
    story.append(Spacer(1, 12))

    # --- AI Analysis ---
    if 'ai_analysis' in analysis_results:
        story.append(Paragraph("AI Executive Summary", styles['Heading2']))
        analysis_text = analysis_results['ai_analysis']
        # Split by newlines to create separate paragraphs
        for para in analysis_text.split('\n'):
            if para.strip():
                story.append(Paragraph(para, styles['Normal']))
                story.append(Spacer(1, 6))
        story.append(Spacer(1, 12))

    # --- Dataset Info ---
    story.append(Paragraph("Dataset Overview", styles['Heading2']))
    rows, cols = df.shape
    info_text = f"<b>Rows:</b> {rows} <br/> <b>Columns:</b> {cols} <br/>"
    story.append(Paragraph(info_text, styles['Normal']))
    story.append(Spacer(1, 12))

    # --- Data Quality ---
    if 'data_quality' in analysis_results:
        story.append(Paragraph("Data Quality", styles['Heading2']))
        quality = analysis_results['data_quality']
        score = quality.get('quality_score', 'N/A')
        story.append(Paragraph(f"<b>Quality Score:</b> {score}/100", styles['Normal']))
        
        # Missing Values Table
        missing = quality.get('missing_values', {})
        # Filter only missing > 0 for readability
        missing_filtered = {k: v for k, v in missing.items() if v > 0}
        
        if missing_filtered:
            story.append(Paragraph("<b>Missing Values Identified:</b>", styles['Normal']))
            story.append(Spacer(1, 6))
            data = [["Column", "Missing Count"]]
            for col, count in missing_filtered.items():
                data.append([col, str(count)])
            
            t = Table(data, colWidths=[3*inch, 2*inch])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            story.append(t)
        else:
            story.append(Paragraph("No missing values found.", styles['Normal']))
        story.append(Spacer(1, 12))

    # --- Descriptive Statistics ---
    story.append(Paragraph("Descriptive Statistics", styles['Heading2']))
    if 'descriptive_stats' in analysis_results:
        stats = analysis_results['descriptive_stats']
        
        # Expanded header
        header = ["Column", "Mean", "Std", "Min", "25%", "Median", "75%", "Max"]
        data = [header]
        
        count = 0
        for col, stat_values in stats.items():
            if count >= 20: break # Limit rows
            
            # Helper to safely get and format
            def fmt(key):
                val = stat_values.get(key, 0)
                return str(round(val, 2))

            row = [
                col[:12] + ('..' if len(col)>12 else ''), # Truncate long names
                fmt('mean'),
                fmt('std'),
                fmt('min'),
                fmt('25%'),
                fmt('50%'),
                fmt('75%'),
                fmt('max')
            ]
            data.append(row)
            count += 1
        
        # Adjust table style and column widths to fit more columns
        # Page width is usually 8.5inch - margins implies ~6-7 inches usable.
        # 1.5 + 7*0.7 = 1.5 + 4.9 = 6.4 inch. Should fit.
        col_widths = [1.5*inch] + [0.7*inch]*7
        
        t = Table(data, colWidths=col_widths)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7), # Smaller font for more columns
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        story.append(t)
        if len(stats) > 20:
             story.append(Paragraph("... (Showing top 20 columns)", styles['Normal']))

    story.append(PageBreak())

    # --- Visualizations ---
    story.append(Paragraph("Visual Insights", styles['Title']))
    story.append(Spacer(1, 12))

    # 1. Correlation Heatmap (only if > 1 numeric cols)
    numeric_df = df.select_dtypes(include=[np.number])
    if numeric_df.shape[1] > 1:
        story.append(Paragraph("Correlation Heatmap", styles['Heading2']))
        try:
            fig = Figure(figsize=(6, 5))
            ax = fig.add_subplot(111)
            corr = numeric_df.corr()
            sns.heatmap(corr, annot=False, cmap='coolwarm', cbar=True, ax=ax)
            ax.set_title('Feature Correlation')
            fig.tight_layout()
            
            img_buffer = generate_plot_buffer(fig)
            img = Image(img_buffer, width=6*inch, height=5*inch)
            story.append(img)
            story.append(Spacer(1, 12))
        except Exception as e:
            story.append(Paragraph(f"Could not generate heatmap: {str(e)}", styles['Normal']))

    # 2. Distribution Plots (Top 4 Numeric Cols)
    if not numeric_df.empty:
        story.append(Paragraph("Distributions (Top Features)", styles['Heading2']))
        cols_to_plot = numeric_df.columns[:4]
        
        for col in cols_to_plot:
            try:
                fig = Figure(figsize=(6, 3))
                ax = fig.add_subplot(111)
                sns.histplot(numeric_df[col].dropna(), kde=True, color='skyblue', ax=ax)
                ax.set_title(f'Distribution: {col}')
                fig.tight_layout()
                
                img_buffer = generate_plot_buffer(fig)
                img = Image(img_buffer, width=6*inch, height=3*inch)
                story.append(img)
                story.append(Spacer(1, 8))
            except Exception as e:
                pass
    
    # 3. Categorical Counts (Top 2 Categorical Cols)
    cat_df = df.select_dtypes(include=['object', 'category'])
    if not cat_df.empty:
        story.append(Paragraph("Categorical Distributions", styles['Heading2']))
        cols_to_plot = cat_df.columns[:2]
        
        for col in cols_to_plot:
            try:
                # Top 10 categories only
                top_cats = cat_df[col].value_counts().nlargest(10)
                
                fig = Figure(figsize=(6, 3))
                ax = fig.add_subplot(111)
                sns.barplot(x=top_cats.values, y=top_cats.index, palette='viridis', ax=ax)
                ax.set_title(f'Top Categories: {col}')
                ax.set_xlabel('Count')
                fig.tight_layout()
                
                img_buffer = generate_plot_buffer(fig)
                img = Image(img_buffer, width=6*inch, height=3*inch)
                story.append(img)
                story.append(Spacer(1, 8))
            except Exception as e:
                pass

    doc.build(story)
    buffer.seek(0)
    return buffer
