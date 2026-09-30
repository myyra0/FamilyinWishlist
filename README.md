# FamilyinWishlist

**FamilyinWishlist** is a lightweight userscript for Steam that automatically highlights games on your wishlist that are already owned by a member of your Steam Family. Stop accidentally buying games you already have access to!

## Installation

1. **Install a Userscript Manager:**
   First, install a userscript manager extension for your browser:
   - [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Edge, Safari, Firefox)
   - [Violentmonkey](https://violentmonkey.github.io/) (Chrome, Edge, Firefox)

2. **Add the Script:**
   - Create a new script in your userscript manager.
   - Copy the JavaScript code for **FamilyinWishlist** and paste it into the editor.
   - Save the script (usually `Ctrl + S` or `Cmd + S`).

3. **Enjoy!**
   - Navigate to your [Steam Wishlist](https://store.steampowered.com/wishlist/). The script will run automatically.

## 🛠️ How it Works

When you load your wishlist, the script:
1. Grabs your temporary Steam WebAPI token directly from the page.
2. Checks your personal library (owned games).
3. Checks your Steam Family library (shared games).
4. Compares these lists against the App IDs of the games rendered on your wishlist screen.
5. Applies a CSS class to any matching games.
