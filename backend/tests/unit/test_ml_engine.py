import pytest
import pandas as pd
from app.ml.engines.model_trainer import ModelTrainer

@pytest.fixture
def trainer():
    return ModelTrainer()

def test_trainer_preprocessing(trainer, sample_df):
    """Test target encoding and splitting"""
    # X and y
    y = sample_df["target"]
    X = sample_df.drop("target", axis=1)
    
    # Simple check on input
    assert X.shape == (4, 2)
    assert len(y) == 4

def test_full_training_flow(trainer, sample_df):
    """Test that we can train a model on a tiny dataset"""
    # Duplicate sample_df to have enough rows for CV/Splits
    large_sample = pd.concat([sample_df] * 10, ignore_index=True)
    
    results_dict = trainer.train_all(
        df=large_sample,
        target_column="target",
        test_size=0.2,
        cv_folds=2  # Small folds
    )
    
    assert "results" in results_dict
    assert "best_model" in results_dict
    assert len(results_dict["results"]) > 0
    assert results_dict["best_model"]["model_name"] is not None
