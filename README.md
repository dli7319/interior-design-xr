# Interior Design XR

Interior Design XR (IDXR) is a WebXR application which lets you generate custom furniture, placed and sized directly in your home!

## User Journey

1. A user puts on a WebXR compatible headset, like the [Samsung Galaxy XR](https://www.samsung.com/us/xr/galaxy-xr/galaxy-xr/) powered by [Android XR](https://www.android.com/xr/), and enters the application by simply navigating to the IDXR website within the headset.
2. While inside IDXR, the user has access to the passthrough view, allowing them to see their environment and walk towards the location where they would like to place a new piece of furniture.
3. The user can draw a 2D bounding box by pointing their cursor on the real-world surface, such as the floor or the wall, and dragging outwards. Then they can extrude the bounding box into 3D by hovering their cursor over the 2D bounding box.
4. With a 3D bounding box drawn, the user asks Gemini Live to generate their desired furniture. For example, the user may say "Generate an bookshelf" or "Generate a coffee table". After a few seconds, an image of the furniture with the size and shape of the bounding box will appear.
5. The user can optionally modify the image by asking Gemini Live to trigger a painting mode. After editing, they ask Gemini to regenerate the image with their edits incorporated.
6. Once the user is satisfied with the generated furniture image, they request Gemini to generate a 3D version of the furniture.
7. In approximately one minute, the 3D bounding box and 2D image disappear and are replaced by a 3D model of the furniture.

## XR + AI Features

IDXR uses [XR Blocks](http://xrblocks.github.io/) to leverage the AR passthrough, hand/controller tracking, and depth sensing capabilities of WebXR.

1. [AR passthrough](https://www.w3.org/TR/webxr/#dom-xrsessionmode-immersive-ar) allows the user to see their real environment with virtual contents overlaid.
2. [Hand and controller tracking](https://www.w3.org/TR/webxr/) enables the user to interact with the application using with hand/controller poses and pinch gestures or controller buttons for selection.
3. [Depth sensing](https://www.w3.org/TR/webxr-depth-sensing-1/) enables environment-aware capabilities such as allowing the user to draw bounding boxes in the 3D environment and allowing furniture to appear occluded when moved behind real-world objects.

IDXR also applies cloud AI capabilities from Google Gemini Live, Google Nano Banana, and Meshy.

1. [Gemini Live](https://ai.google.dev/gemini-api/docs/live) enables a natural conversational interface to interact with the application. Specifically, Gemini handles launching different aspects of the application using [function calling](https://ai.google.dev/gemini-api/docs/function-calling?example=meeting), such as triggering the image generation, triggering mesh generation, and enabling/disabling the 3D painting mode.
2. [Nano Banana](https://ai.google.dev/gemini-api/docs/image-generation) powers the image generation capabilities to generate candidate images of furniture in the shape, size, and style requested by the user.
3. [Meshy](https://docs.meshy.ai/en) is used to convert the funiture image from Nano Banana into an actual 3D textured mesh to be placed in the XR scene.

## Development Guide

Interior Design XR is written in JavaScript and has no build steps.
We simply require any http server and a Gemini API key from [AI Studio](https://aistudio.google.com/).
We recommend using [http-server](https://www.npmjs.com/package/http-server) for development.

Most development can be done on a desktop browser in the [XR Blocks Simulator](https://xrblocks.github.io/docs/manual/Simulator/).

Once an http server is set up, add your Gemini API key to the following URL and paste it in the browser:

```
http://localhost:8080/?key=API_KEY_HERE
```
