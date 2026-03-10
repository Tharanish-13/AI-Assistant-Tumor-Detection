import torch
from model import load_model, predict

def test_pipeline():
    print("Loading 5-model ensemble...")
    model_dict, loc_model = load_model(device='cpu')
    print("Models loaded successfully!\n")

    # Mock a pseudo-random image to avoid kicking in the "blank image" default
    # And force some variance so it doesn't get flagged as blank
    tensor_input = torch.rand(1, 3, 256, 256)
    tensor_input[0, 0, 100:150, 100:150] = 1.0 # Add significant features

    print("Running Prediction Pipeline on synthetic tensor...")
    res = predict(model_dict, loc_model, tensor_input, device='cpu')

    print("=== PIPELINE OUTPUT ===")
    print(f"Detected Organ: {res['Detected Organ']}")
    print(f"Organ Confidence: {res['Organ Confidence']:.2f}")
    print(f"Tumor Pattern Detected: {res['Tumor Pattern Detected']}")
    print(f"Confidence Score: {res['Confidence Score']:.2f}")
    print("=======================")

    print("\nPipeline Verification Complete!")

if __name__ == '__main__':
    test_pipeline()
