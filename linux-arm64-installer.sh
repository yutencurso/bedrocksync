echo make sure you have npm
echo installing commander
npm install commander@9.2.0
echo installed ---------------------------------
echo opening Downloads folder...
cd ~/Downloads
echo cloning bedrocksync git repository...
git clone https://github.com/yutencurso/bedrocksync.git
echo opening bedrocksync folder...
cd ~/Downloads/bedrocksync
echo configuring bedrocksync command...
chmod +x dist/bedrocksync
sudo mv dist/bedrocksync /usr/local/bin/
echo bedrocksync installed