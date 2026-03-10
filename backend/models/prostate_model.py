import torch
import torch.nn as nn
from torchvision import models

PROSTATE_CLASSES = [
    "Normal",
    "Abnormal prostate tissue region",
    "Lesion",
    "Irregular gland structure",
    "Tissue density change"
]

class ProstateTumorModel(nn.Module):
    def __init__(self, num_classes=len(PROSTATE_CLASSES), use_pretrained=True):
        super(ProstateTumorModel, self).__init__()
        weights = models.ResNet50_Weights.IMAGENET1K_V2 if use_pretrained else None
        self.model = models.resnet50(weights=weights)
        
        num_ftrs = self.model.fc.in_features
        self.model.fc = nn.Sequential(
            nn.Linear(num_ftrs, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, num_classes)
        )
        
    def forward(self, x):
        out = self.model(x)
        return torch.sigmoid(out)

def load_prostate_model(weights_path=None, device='cpu'):
    model = ProstateTumorModel(use_pretrained=weights_path is None)
    if weights_path:
        model.load_state_dict(torch.load(weights_path, map_location=device))
    model.to(device)
    model.eval()
    return model
