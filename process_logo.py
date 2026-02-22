from PIL import Image
import os
import glob

def process_image():
    # Use the existing logo asset Instead of guessing from temp storage
    latest_image = r"d:\Todo V2\apps\web\src\assets\logo.png"
    if not os.path.exists(latest_image):
        print("logo.png not found!")
        return

    print(f"Processing: {latest_image}")

    img = Image.open(latest_image).convert("RGBA")
    datas = img.getdata()

    # 1. Remove black background and make icon white
    new_data = []
    for item in datas:
        # use a higher threshold to ignore JPEG compression artifacts (noise)
        if item[0] < 100 and item[1] < 100 and item[2] < 100:
            new_data.append((255, 255, 255, 0)) # Transparent
        else:
            new_data.append((255, 255, 255, 255)) # Make icon white

    img.putdata(new_data)

    # 2. Extract icon from the left side (~35% of the image width)
    width, height = img.size
    cut_x = int(width * 0.35)
    
    # Crop to just the left side where the icon is
    icon_img = img.crop((0, 0, cut_x, height))
    
    # Tighten the crop exactly to the non-transparent pixels!
    bbox = icon_img.getbbox()
    if bbox:
        icon_img = icon_img.crop(bbox)

    # Save the icon
    output_path = r"d:\Todo V2\apps\web\src\assets\icon.png"
    icon_img.save(output_path)
    print("Saved icon tightly cropped to", output_path)

if __name__ == "__main__":
    process_image()
