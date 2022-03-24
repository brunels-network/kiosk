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
matchbox-window-manager -use_titlebar no &
unclutter &    # hide X mouse cursor unless mouse activated
chromium-browser --display=:0 --kiosk --incognito --window-position=0,0 http://localhost
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

## Securing the kiosk

This will be a standalone kiosk. To keep it secure we need to disable
all network and all bluetooth access.

## Turning on overlayfs

We want to run the kiosk in read-only mode, so that we reduce the 
risk of corruption of the SD card. To do this, we will disable swap,
and then switch on an overlayfs that will write to RAM only. This
should add some resilience to the kiosk, reducing the risk of 
breakage when the power is switched off, and also reducing the risk
of someone accidentally (or purposefully) making changes to the
configuration.



