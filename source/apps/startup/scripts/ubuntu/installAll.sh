#!/bin/bash

cd ~

# ----- Install teamviewer -----

echo "          ----- INSTALLING TEAMVIEWER -----"
# Download teamviewer
wget https://download.teamviewer.com/download/linux/teamviewer_amd64.deb
# Install teamviewer 
sudo apt install -y ./teamviewer_amd64.deb
# Disable WayLand (otherwise you can't connect to the remote computer without a prompt to the user)
sudo sed -i 's/#WaylandEnable=false/WaylandEnable=false' /etc/gdm3/custom.conf
# Remove the installation file
rm -rf ./teamviewer_amd64.deb

# ----- Install npm -----
echo "          ----- INSTALLING NPM -----"
sudo apt install npm

# Allow global packages to be installed and ran without sudo priviliges
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
echo "export PATH=$PATH:$(npm get prefix)/bin" >> ~/.bashrc
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.profile
source ~/.profile
source ~/.bashrc

# ----- Install n (dependency: npm) -----
echo "          ----- INSTALLING N -----"
npm install -g n
sudo mkdir -p /usr/local/n
sudo chown -R $(whoami) /usr/local/n
sudo mkdir -p /usr/local/bin /usr/local/lib /usr/local/include /usr/local/share
sudo chown -R $(whoami) /usr/local/bin /usr/local/lib /usr/local/include /usr/local/share

# ----- Install Node.js (dependency: n, npm)
echo "          ----- INSTALLING NODE.JS -----"
n lts

# ----- Remove updater ----- 
echo "          ----- REMOVING UPDATE MANAGER -----"
sudo apt-get remove update-manager

# ----- Install the babybox monitoring program -----
cd ~
git config --global credential.helper store
git clone https://github.com/zbyju/babybox.git
cd ~/babybox/source/apps/startup/scripts/ubuntu
./install.sh
sudo apt-get install -y fonts-open-sans

# ----- Enable starting panel on PC startup -----
touch ~/.config/autostart/babybox.desktop
echo "[Desktop Entry]
Type=Application
Name=Babybox
Exec=~/babybox/source/apps/startup/scripts/ubuntu/startup.sh
Comment=BabyboxPanel
X-GNOME-Autostart-enabled=true" >> ~/.config/autostart/babybox.desktop

