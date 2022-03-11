# PolytempoWeb

A browser-based application to synchronise musicians. It displays the music on the screen and indicates the musical tempo to the player either visually through an animation that resembles the gestures of a conductor or acoustically through a click track.

PolytempoWeb is the browser-based (and simplified) version of [PolytempoNetwork](https://github.com/philippekocher/polytempo).

For further information please refer to the [project's website](https://polytempo.zhdk.ch).


## Using PolytempoWeb in a local network

- Download Node.js from [https://nodejs.org](https://nodejs.org) and run the installer.

- Clone the repository and install the dependencies:

      git clone https://github.com/philippekocher/polytempoWeb.git
      cd polytempoWeb/server
      npm install			

- Put all your polytempo files in the folder 'files'.

- Start the server:

      npm start

- In the terminal, the server indicates the IP address at which it is running. To access PolytempoWeb from any device connected to the local network, enter this IP address in a web browser.

- Stop the server with ctrl+c
