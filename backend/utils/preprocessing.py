import torch
from torchvision import transforms

def get_base_transforms(input_size=256):
    """
    Standard preprocessing for inference and validation.
    """
    return transforms.Compose([
        transforms.Resize((input_size, input_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

def get_training_transforms(input_size=256):
    """
    Preprocessing with data augmentation for training.
    """
    return transforms.Compose([
        transforms.Resize((input_size + 32, input_size + 32)),
        transforms.RandomCrop(input_size),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
