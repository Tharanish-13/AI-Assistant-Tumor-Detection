import os
import torch
import torch.nn as nn
import torch.optim as optim
from utils.dataset_loader import get_dataloaders
from models.brain_model import load_brain_model, BRAIN_CLASSES
import argparse

def train(data_dir, epochs=20, batch_size=32, lr=1e-4, save_path="brain_model.pth", device='cuda'):
    class_map = {cls: idx for idx, cls in enumerate(BRAIN_CLASSES)}
    train_loader, val_loader = get_dataloaders(data_dir, class_map, batch_size=batch_size)
    
    if not train_loader or not val_loader:
        print("Error: Missing training or validation data.")
        return

    model = load_brain_model(device=device)
    # Using BCELoss for multi-label classification (since outputs are sigmoided)
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, 'min', patience=3, factor=0.5)
    
    best_val_loss = float('inf')
    early_stop_patience = 5
    early_stop_counter = 0
    
    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        
        for inputs, labels in train_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            # Create one-hot labels for BCELoss
            labels_one_hot = torch.zeros(labels.size(0), len(BRAIN_CLASSES)).to(device)
            labels_one_hot.scatter_(1, labels.unsqueeze(1), 1.0)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels_one_hot)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item() * inputs.size(0)
            
        train_loss /= len(train_loader.dataset)
        
        model.eval()
        val_loss = 0.0
        correct = 0
        total = 0
        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                labels_one_hot = torch.zeros(labels.size(0), len(BRAIN_CLASSES)).to(device)
                labels_one_hot.scatter_(1, labels.unsqueeze(1), 1.0)
                
                outputs = model(inputs)
                loss = criterion(outputs, labels_one_hot)
                val_loss += loss.item() * inputs.size(0)
                
                # Assume highest prob is the prediction for top-1 accuracy metric
                _, predicted = outputs.max(1)
                total += labels.size(0)
                correct += predicted.eq(labels).sum().item()
                
        val_loss /= len(val_loader.dataset)
        val_acc = 100. * correct / total
        
        print(f"Epoch {epoch+1}/{epochs} - Train Loss: {train_loss:.4f} - Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.2f}%")
        
        scheduler.step(val_loss)
        
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), save_path)
            print(f"Saved best model with validation loss {val_loss:.4f}")
            early_stop_counter = 0
        else:
            early_stop_counter += 1
            if early_stop_counter >= early_stop_patience:
                print("Early stopping triggered.")
                break

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", type=str, required=True, help="Directory with train/val folders")
    parser.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu")
    parser.add_argument("--epochs", type=int, default=20)
    args = parser.parse_args()
    train(args.data_dir, epochs=args.epochs, device=args.device)
