# It's a GNOME Shell extension adds support quake-mode for any application


https://github.com/user-attachments/assets/e01159d2-7292-411e-a851-8aa5727086f5



## Installation

```bash
git clone https://github.com/initiateit/quake-mode-shortcuts.git

cd quake-mode-shortcuts

gnome-extensions pack quake-mode-initiateit@repsac-by.github.com --extra-source={quakemodeapp,indicator,util}.js

gnome-extensions install quake-mode-initiateit@repsac-by.github.com.zip
```

## Usage

Go to GNOME Extensions or Extension Manager and open the settings for quake-mode. Switch over to the accelerators tab and define a shortcut key and an application it should open. Use that key to toggle quake-mode for your chosen app.

### Window Resize & Monitor Shortcuts

This fork adds keyboard shortcuts to resize and move the quake-mode window:

- **Ctrl + Up**: Increase window height  
- **Ctrl + Down**: Decrease window height  
- **Ctrl + Right**: Increase window width  
- **Ctrl + Left**: Decrease window width  
- **Ctrl + Shift + Left/Right**: Move the window to the previous or next monitor

## Known Issues

Due to the implementation of some tricks of initial placement of the window in the desired location on the screen and suppression of the initial animation with replacement of its own, it may not always work as expected.

## P.S.

Developed for usage with [tilix](https://github.com/gnunn1/tilix) on Wayland but can manage almost any application.
