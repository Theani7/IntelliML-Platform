__all__ = ['ModelTrainer', 'ModelExplainer', 'DataAnalyzer']


def __getattr__(name):
    if name == 'ModelTrainer':
        from app.ml.engines.model_trainer import ModelTrainer
        return ModelTrainer
    if name == 'ModelExplainer':
        from app.ml.engines.explainer import ModelExplainer
        return ModelExplainer
    if name == 'DataAnalyzer':
        from app.ml.engines.data_analyzer import DataAnalyzer
        return DataAnalyzer
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
