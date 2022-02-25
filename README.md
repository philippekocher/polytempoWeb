# PolytempoWeb

A browser-based application to synchronise musicians. It displays the music on the screen and indicates the musical tempo to the player either visually through an animation that resembles the gestures of a conductor or acoustically through a click track.

PolytempoWeb is the browser-based (and simplified) version of [PolytempoNetwork](https://github.com/philippekocher/polytempo).

For further information please refer to the [project's website](https://polytempo.zhdk.ch).


## Using PolytempoWeb in a local network

1. Download Node.js from [https://nodejs.org](https://nodejs.org) and run the installer.

2. cd into the 'server' directory and execute the following command

    npm install			

3. Put all your polytempo files in the folder 'files'

4. Start the server

    npm start

5. In the terminal, the server indicates the IP address at which it is running. To access PolytempoApp from any device connected to the local network, enter this IP address in a web browser.

6. Stop the server with ctrl+c
