# Setting up a Raspberry Pi to act as a kiosk

I am using Raspbian GNU/Linux 11 (bullseye).

I logged in. Set up passwordless login. Then change the screen
resolution so that it matches that of the display
(1920x1080@60Hz or 1920x1080@30Hz).

Note that the application has been optimised for a resolution
of 1920x1080 (Full HD). The Raspberry Pi I am using (400) is not powerful
enough to give a smooth experience at higher resolutions
(e.g. 4K).

## Initial setup and test

First, install npm

```
$ sudo apt install npm
```

Then download the website

```
$ git clone https://github.com/brunels-network/kiosk
$ cd kiosk
```

Install all of the dependencies

```
$ npm install
```

Then test it is all working via

```
$ npm start
```

This should start the chromium web browser, opening the test site 
at `http://localhost:3000/kiosk`.

## Configure the web server

Install an nginx web server via

```
$ sudo apt-get install nginx
```

This will install nginx and set it to start automatically
on boot. 

You can start it now using

```
$ sudo systemctl start nginx
```

Open chromium and navigate to `http://localhost`. You should see the nginx
welcome screen if everything is working.

Next, tell npm that we will be deploying this website to 
`http://localhost`. Do this by editing `package.json` and updating
it to have

```
"homepage": "http://localhost/"
```

Next, build the website by running (in the kiosk directory)

```
$ npm run build
```

This will create an optimised production build of the kiosk
website in the `build` directory.

Now update nginx to use this directory as the web root, e.g.
by editing `/etc/nginx/sites-enabled/default` to include

```
root /home/pi/kiosk/build
```

Test the configuration using

```
$ sudo nginx -t
```

If it is ok, then ask nginx to load this configuration using

```
$ sudo nginx -s reload
```

Now navigate to `http://localhost` in chromium and check that the 
application loads and runs correctly.

## Starting chromium on boot

First, install unclutter, to hide the mouse pointer

```
$ sudo apt-get install unclutter
```

Next, install a simple window manager

```
$ sudo apt-get install matchbox-window-manager xautomation
```

Now, configure the boot options. Start the Raspberry Pi Configuration
GUI and set `Boot` to `To CLI`. Then make sure that 
`Auto Login` is turned on. 

Next, create a file `~/run_kiosk.sh` and copy into it

```
#!/bin/sh
xset -dpms     # disable DPMS (Energy Star) features.
xset s off     # disable screen saver
xset s noblank # don't blank the video device
xrandr -s 1920x1080  # set to Full HD resolution
matchbox-window-manager -use_titlebar no &
unclutter -idle 0.5 -root &    # hide X mouse cursor unless mouse activated
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' /home/pi/.config/chromium/Default/Preferences
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' /home/pi/.config/chromium/Default/Preferences
chromium-browser --display=:0 --noerrdialogs --disable-infobars --kiosk --incognito --window-position=0,0 http://localhost
```

(thanks to [this blog post](https://reelyactive.github.io/diy/pi-kiosk/) for these instructions)

Make this script executable 

```
$ chmod 755 ~/run_kiosk.sh
```

Now add this script to the `.bashrc` file, so that it will be 
called on login. Add this line to `.bashrc`.

```
xinit /home/pi/run_kiosk.sh -- vt$(fgconsole)
```

(I put this at the end of the file)

Reboot your Pi. It should (hopefully) start in kiosk mode.

## Accessing the kiosk

You can access a login terminal by pressing `CTRL+ALT+F2` when in kiosk
mode. Log in using the username (`pi`) and password (`whatever you set`).
If you need to make any changes, you can disable the kiosk mode
by commenting out the `xinit` line in your `.bashrc` and using
`sudo raspi-config` to switch back to an auto-login desktop login.

## Securing the kiosk

This will be a standalone kiosk. To keep it secure we need to disable
all network and all bluetooth access, plus ensure that `sudo` requires
a password.

To require sudo to use a password (indeed to use the root password)
first set a root password by typing

```
$ sudo passwd
```

and entering the password that you want.

Next, edit `/etc/sudoers.d/010_pi-nopasswd` and edit the line to read

```
pi ALL=(ALL) ALL
```

To disable bluetooth, edit `/boot/config.txt` and add the line

```
# Disable Bluetooth
dtoverlay=disable-bt
```

Next, disable all bluetooth-related services

```
$ sudo systemctl disable hciuart
$ sudo systemctl disable hciuart.service
$ sudo systemctl disable bluealsa.service
$ sudo systemctl disable bluetooth.service
```

Finally, remove all bluetooth-related packages

```
$ sudo apt-get purge bluez -y
$ sudo apt-get autoremove -y
```

Reboot to check that the changes were made ok.

Next, we want to disable wifi. We will do this using
`rfkill`. To block wifi type

```
$ sudo rfkill block wifi
```

You can unblock wifi again (if you need to) by typing

```
$ sudo rfkill unblock wifi
```

This should be persistent across reboots.

## Turning on overlayfs

We want to run the kiosk in read-only mode, so that we reduce the 
risk of corruption of the SD card. To do this, we will disable swap,
and then switch on an overlayfs that will write to RAM only. This
should add some resilience to the kiosk, reducing the risk of 
breakage when the power is switched off, and also reducing the risk
of someone accidentally (or purposefully) making changes to the
configuration.

First, let's disable swap

```
$ sudo dphys-swapfile swapoff
$ sudo dphys-swapfile uninstall
$ sudo systemctl disable dphys-swapfile
```

Next, we want to replace the file-based syslog with a memory
ring-buffer logger, like the one provided by 
busybox-syslogd. Just install this - it will automatically
replace rsyslog :-)

```
$ sudo apt-get install busybox-syslogd
```

You can read the logs by running

```
$ logread
```

(or `logread -f` to read the data as it arrives)

We can also reduce the verbosity of `cron` by logging only
errors. To do this, we edit `/etc/default/cron` and
add

```
EXTRA_OPTS="-L 4"
```

Finally, we enable overlayfs by selecting the option in 
`raspi-config`, e.g. via `sudo raspi-config`.

It is under "Performance Options" then "Overlay File System".
Switch it on, and also switch on Boot Volume write protection.

Reboot, and you should now have your safe and secure kiosk :-)
