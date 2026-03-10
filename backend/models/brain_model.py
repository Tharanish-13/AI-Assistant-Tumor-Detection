import torch
import torch.nn as nn
from torchvision import models

BRAIN_CLASSES = [
    "Normal",
    "Abnormal tissue region",
    "Tumor boundary",
    "Edema",
    "Irregular intensity region"
]

class BrainTumorModel(nn.Module):
    def __init__(self, num_classes=len(BRAIN_CLASSES), use_pretrained=True):
        super(BrainTumorModel, self).__init__()
        weights = models.EfficientNet_B0_Weights.IMAGENET1K_V1 if use_pretrained else None
        self.model = models.efficientnet_b0(weights=weights)
        
        num_ftrs = self.model.classifier[1].in_features
        self.model.classifier = nn.Sequential(
            nn.Dropout(p=0.3, inplace=True),
            nn.Linear(num_ftrs, num_classes)
        )
        
    def forward(self, x):
        out = self.model(x)
        return torch.sigmoid(out)

def load_brain_model(weights_path=None, device='cpu'):
    model = BrainTumorModel(use_pretrained=weights_path is None)
    if weights_path:
        model.load_state_dict(torch.load(weights_path, map_location=device))
    model.to(device)
    model.eval()
    return model
