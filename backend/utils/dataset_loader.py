import os
from PIL import Image
import torch
from torch.utils.data import Dataset, DataLoader
from utils.preprocessing import get_training_transforms, get_base_transforms

class MedicalImageDataset(Dataset):
    def __init__(self, root_dir, class_map, transform=None):
        """
        Generic Dataset loader for medical images.
        root_dir: Directory containing subdirectories of classes (e.g., train/Normal)
        class_map: Dictionary mapping class names to integer labels
        """
        self.root_dir = root_dir
        self.class_map = class_map
        self.transform = transform
        self.samples = []
        
        # Load all image paths
        for class_name, class_idx in self.class_map.items():
            class_dir = os.path.join(self.root_dir, class_name)
            if os.path.exists(class_dir):
                for img_name in os.listdir(class_dir):
                    if img_name.lower().endswith(('.png', '.jpg', '.jpeg', '.dcm')):
                        self.samples.append((os.path.join(class_dir, img_name), class_idx))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, label = self.samples[idx]
        image = Image.open(img_path).convert("RGB")
        
        if self.transform:
            image = self.transform(image)
        
        return image, torch.tensor(label, dtype=torch.long)

def get_dataloaders(data_dir, class_map, batch_size=32, input_size=256):
    """
    Returns train and validation dataloaders assuming standard directory structure.
    Expected structure:
    data_dir/
      train/
        class_1/
        class_2/
      val/
        class_1/
        class_2/
    """
    train_dir = os.path.join(data_dir, 'train')
    val_dir = os.path.join(data_dir, 'val')
    
    train_dataset = MedicalImageDataset(
        train_dir, 
        class_map, 
        transform=get_training_transforms(input_size=input_size)
    )
    
    val_dataset = MedicalImageDataset(
        val_dir, 
        class_map, 
        transform=get_base_transforms(input_size=input_size)
    )
    
    # Check if directories exist and have data
    if len(train_dataset) == 0:
        print(f"Warning: No training samples found in {train_dir}")
        train_loader = None
    else:
        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=4)

    if len(val_dataset) == 0:
        print(f"Warning: No validation samples found in {val_dir}")
        val_loader = None
    else:
        val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=4)
    
    return train_loader, val_loader
