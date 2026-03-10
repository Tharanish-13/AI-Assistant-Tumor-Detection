import os
from PIL import Image
import numpy as np
import sys

# Add parent dir to path so we can import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.organ_classifier import ORGAN_CLASSES
from models.brain_model import BRAIN_CLASSES
from models.liver_model import LIVER_CLASSES
from models.lung_model import LUNG_CLASSES
from models.prostate_model import PROSTATE_CLASSES

def create_dummy_images(base_dir, classes, num_train=10, num_val=5):
    """Generates random noise images to act as a synthetic medical dataset for pipeline verification."""
    print(f"Generating dataset at {base_dir} for classes: {classes}")
    for cls in classes:
        for split, num_samples in [('train', num_train), ('val', num_val)]:
            dir_path = os.path.join(base_dir, split, cls)
            os.makedirs(dir_path, exist_ok=True)
            for i in range(num_samples):
                # Generate a random colored noise image
                img_array = np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8)
                img = Image.fromarray(img_array)
                img.save(os.path.join(dir_path, f"{cls}_{i}.jpg"))

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--base_dir", default="synthetic_dataset", type=str)
    args = parser.parse_args()
    
    # Organ Classifier Dataset
    create_dummy_images(os.path.join(args.base_dir, "organ"), ORGAN_CLASSES)
    
    # Submodel Datasets
    create_dummy_images(os.path.join(args.base_dir, "brain"), BRAIN_CLASSES)
    create_dummy_images(os.path.join(args.base_dir, "liver"), LIVER_CLASSES)
    create_dummy_images(os.path.join(args.base_dir, "lung"), LUNG_CLASSES)
    create_dummy_images(os.path.join(args.base_dir, "prostate"), PROSTATE_CLASSES)
    
    print(f"\nSynthetic datasets successfully generated in '{args.base_dir}'")
