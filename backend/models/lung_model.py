import torch
import torch.nn as nn
from torchvision import models
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor

LUNG_CLASSES = [
    "Normal",
    "Pulmonary Nodule",
    "Lung Mass",
    "Ground-glass opacity",
    "Abnormal lung tissue pattern"
]

class LungTumorModel(nn.Module):
    def __init__(self, num_classes=len(LUNG_CLASSES), use_pretrained=True):
        super(LungTumorModel, self).__init__()
        weights = models.DenseNet121_Weights.IMAGENET1K_V1 if use_pretrained else None
        self.densenet = models.densenet121(weights=weights)
        
        num_ftrs = self.densenet.classifier.in_features
        self.densenet.classifier = nn.Sequential(
            nn.Linear(num_ftrs, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, num_classes)
        )
        
    def forward(self, x):
        out = self.densenet(x)
        return torch.sigmoid(out)

class TumorLocalizationModel(nn.Module):
    def __init__(self, num_classes=len(LUNG_CLASSES)+1): # +1 for background
        super(TumorLocalizationModel, self).__init__()
        # Load a pre-trained Faster R-CNN model
        weights = models.detection.FasterRCNN_ResNet50_FPN_Weights.DEFAULT
        self.model = models.detection.fasterrcnn_resnet50_fpn(weights=weights)
        
        # Get number of input features for the classifier
        in_features = self.model.roi_heads.box_predictor.cls_score.in_features
        
        # Replace the pre-trained head with a new one
        self.model.roi_heads.box_predictor = FastRCNNPredictor(in_features, num_classes)
        
    def forward(self, images, targets=None):
        return self.model(images, targets)

def load_lung_model(weights_path=None, loc_weights_path=None, device='cpu'):
    model = LungTumorModel(use_pretrained=weights_path is None)
    if weights_path:
        model.load_state_dict(torch.load(weights_path, map_location=device))
    model.to(device)
    model.eval()
    
    loc_model = TumorLocalizationModel(num_classes=len(LUNG_CLASSES)+1)
    if loc_weights_path:
        loc_model.load_state_dict(torch.load(loc_weights_path, map_location=device))
    loc_model.to(device)
    loc_model.eval()
    
    return model, loc_model
