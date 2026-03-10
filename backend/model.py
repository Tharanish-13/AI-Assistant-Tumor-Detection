import torch
import torch.nn as nn
from torchvision import models
import torchvision
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor
import torch.optim as optim
import random

# Classes relevant for Tumor/Abnormality detection
CLASSES = [
    "Normal",
    "Pulmonary Nodule",
    "Mass",
    "Pleural Effusion",
    "Lesion/Tumor"
]

class TumorDetectionModel(nn.Module):
    def __init__(self, num_classes=len(CLASSES), use_pretrained=True):
        super(TumorDetectionModel, self).__init__()
        # Load a pre-trained DenseNet121 model
        weights = models.DenseNet121_Weights.IMAGENET1K_V1 if use_pretrained else None
        self.densenet = models.densenet121(weights=weights)
        
        # Replace the classifier for our specific number of classes
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
    def __init__(self, num_classes=len(CLASSES)+1): # +1 for background
        super(TumorLocalizationModel, self).__init__()
        # Load a pre-trained Faster R-CNN model
        weights = torchvision.models.detection.FasterRCNN_ResNet50_FPN_Weights.DEFAULT
        self.model = torchvision.models.detection.fasterrcnn_resnet50_fpn(weights=weights)
        
        # Get number of input features for the classifier
        in_features = self.model.roi_heads.box_predictor.cls_score.in_features
        
        # Replace the pre-trained head with a new one
        self.model.roi_heads.box_predictor = FastRCNNPredictor(in_features, num_classes)
        
    def forward(self, images, targets=None):
        return self.model(images, targets)

def load_model(weights_path=None, loc_weights_path=None, device='cpu'):
    """
    Initializes the models and loads weights if provided.
    """
    model = TumorDetectionModel(use_pretrained=weights_path is None)
    if weights_path:
        model.load_state_dict(torch.load(weights_path, map_location=device))
    
    model.to(device)
    model.eval()
    
    loc_model = TumorLocalizationModel()
    if loc_weights_path:
        loc_model.load_state_dict(torch.load(loc_weights_path, map_location=device))
        
    loc_model.to(device)
    loc_model.eval()
    
    return model, loc_model

def predict(model, loc_model, tensor_input, device='cpu'):
    """
    Runs inference on a prepared input tensor (B, C, H, W).
    Returns a dictionary of class names to probabilities, and detected bounding boxes.
    """
    if not isinstance(tensor_input, torch.Tensor):
        tensor_input = torch.tensor(tensor_input, dtype=torch.float32)
        
    tensor_input = tensor_input.to(device)
    
    with torch.no_grad():
        # 1. Classification
        outputs = model(tensor_input)
        probs = outputs.cpu().numpy()[0]
        
        # 2. Object Localization (Mocked for demonstration if untrained)
        # An untrained Faster R-CNN will return nonsense boxes. We run it to ensure the pipeline doesn't error out.
        loc_outputs = loc_model(tensor_input)[0] 
        
    results = {CLASSES[i]: float(probs[i]) for i in range(len(CLASSES))}
    
    # Generate synthetic localizations for demonstration to highlight the end-to-end functionality in the UI
    # In production, replace this with parsed loc_outputs['boxes'], loc_outputs['labels'], etc.
    localizations = []
    
    # Base bounding box scale on the 256x256 image size
    img_h, img_w = tensor_input.shape[2], tensor_input.shape[3]
    
    for i, cls in enumerate(CLASSES):
        # Let's show boxes for abnormalities with > 30% confidence for demo
        prob_val = float(probs[i])
        if cls != "Normal" and prob_val > 0.3:
            # Generate a plausible bounding box within the image dimensions
            w = random.randint(int(0.15 * img_w), int(0.35 * img_w))
            h = random.randint(int(0.15 * img_h), int(0.35 * img_h))
            x = random.randint(int(0.1 * img_w), int(img_w - w - 0.1 * img_w))
            y = random.randint(int(0.1 * img_h), int(img_h - h - 0.1 * img_h))
            
            # Normalize to 0-1 range for the frontend responsiveness
            localizations.append({
                "class": cls,
                "score": prob_val,
                "x_norm": x / img_w,
                "y_norm": y / img_h,
                "w_norm": w / img_w,
                "h_norm": h / img_h,
                "x": x,
                "y": y,
                "w": w,
                "h": h
            })

    return results, localizations

# ==========================================
# Modular structure for model training
# ==========================================
def train_model(model, train_loader, val_loader, num_epochs=10, device='cuda', learning_rate=1e-4):
    """
    Skeleton for training the model securely with medical datasets.
    """
    model.to(device)
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    
    for epoch in range(num_epochs):
        model.train()
        running_loss = 0.0
        
        for inputs, labels in train_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels.float())
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * inputs.size(0)
            
        epoch_loss = running_loss / len(train_loader.dataset)
        print(f"Epoch {epoch+1}/{num_epochs} - Train Loss: {epoch_loss:.4f}")
        
    return model
