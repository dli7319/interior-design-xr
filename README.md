<div align="center">

# 🛋️ Interior Design XR 🪄

**The future of interior design is here. Built for [Galaxy XR](https://www.samsung.com/us/xr/galaxy-xr/galaxy-xr/) on [Android XR](https://www.android.com/xr/) and powered by [XR Blocks](http://xrblocks.github.io/).**

![Made with Gemini](https://img.shields.io/badge/Made%20with-Gemini-blue?style=for-the-badge&logo=google-gemini)
![License](https://img.shields.io/github/license/dli7319/interior-design-xr?style=for-the-badge)
![Language](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)

</div>

Interior Design XR (IDXR) is a revolutionary WebXR application that redefines how we design our living spaces. By leveraging the power of **Galaxy XR** and **Android XR**, IDXR provides a seamless and immersive mixed reality experience. With the help of **XR Blocks**, we bring generative AI to your home, allowing you to create and visualize custom furniture in real-time.

## 🏆 Built for the Future of XR

This project is designed to showcase the immense potential of the next generation of XR devices.

- **🚀 Galaxy XR & Android XR:** We are proud to develop for the future of mobile XR. The combination of Galaxy XR's cutting-edge hardware and Android XR's robust platform provides the perfect foundation for immersive and performant mixed reality experiences.
- **🧱 XR Blocks:** This project is built on XR Blocks, a powerful framework that unlocks the full potential of WebXR. XR Blocks enables us to rapidly prototype and build advanced XR features, such as passthrough vision, hand tracking, and depth sensing, creating a truly interactive and intuitive user experience.

## ✨ Features

- **Seamless Mixed Reality:** See your room and virtual furniture together in stunning clarity, thanks to the advanced passthrough capabilities of modern XR devices.
- **Intuitive Gesture Control:** Reach out and design with your hands. Draw bounding boxes for furniture directly on your floors and walls.
- **3D Scene Understanding** Drag virtual objects and watch as they get occluded by real-world objects.
- **Voice-Powered AI:** Simply describe the furniture you imagine. "A round wooden coffee table," or "a futuristic bookshelf," and watch our AI bring it to life.
- **Iterate with a Sketch:** Modify the AI's creation by sketching new ideas directly onto the generated image.
- **From 2D to 3D in Seconds:** Love the design? Convert the 2D image into a full 3D model and place it in your room.

## 🚀 Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/dli7319/interior-design-xr.git
    cd interior-design-xr
    ```
2.  **Get a Gemini API Key:**
    You'll need a Gemini API key from [Google AI Studio](https://aistudio.google.com/).
3.  **Start a web server:**
    This project is pure JavaScript and requires no build step. You can use any simple HTTP server. We recommend `http-server`.
    ```bash
    npx http-server
    ```
4.  **Open in your browser:**
    For the ultimate experience, open the URL on a **Galaxy XR** headset. For development, you can use a desktop browser with the [XR Blocks Simulator](https://xrblocks.github.io/docs/manual/Simulator/).

    Append your Gemini API key to the URL:

    ```
    http://localhost:8080/?key=YOUR_API_KEY_HERE
    ```

## 🛠️ Technology Stack

- **XR Platform:** **Galaxy XR** on **Android XR**
- **WebXR Framework:** [**XR Blocks**](https://xrblocks.github.io/) and [**Three.js**](https://threejs.org/)
- **AI:**
  - [**Google Gemini**](https://ai.google.dev/gemini-api/docs/live): For natural language understanding and function calling.
  - [**Nano Banana**](https://ai.google.dev/gemini-api/docs/image-generation): For generating high-quality images of furniture.
  - [**Meshy**](https://docs.meshy.ai/en): To convert the 2D images into 3D models.

## 🛣️ Future Work

- [ ] Deeper integration with **Android XR** features such as light estimation and 3D meshing.
- [ ] Photorealistic rendering with advanced lighting and materials.
- [ ] Saving and sharing of complete room designs.
- [ ] Collaboration mode for designing with others in the same space.

## 👥 Team

- [Adam Ren](https://www.linkedin.com/in/jiahao-ren-b912b2b3/)
- [David Li](https://www.linkedin.com/in/david-li-23b812149/)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
