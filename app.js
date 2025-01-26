let video
let canvas
let capturedImage
let faceDescriptor

document.addEventListener("DOMContentLoaded", async () => {
  video = document.getElementById("video")
  canvas = document.getElementById("canvas")
  const captureBtn = document.getElementById("capture")
  const registerBtn = document.getElementById("register")
  const loginBtn = document.getElementById("login")

  captureBtn.addEventListener("click", captureImage)
  registerBtn.addEventListener("click", register)
  loginBtn.addEventListener("click", login)

  await setupCamera()
  await loadFaceApiModels()
})

async function setupCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} })
    video.srcObject = stream
  } catch (error) {
    console.error("Error accessing the camera:", error)
    showMessage("Unable to access the camera. Please check your permissions.", "red")
  }
}

async function loadFaceApiModels() {
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri("/models")
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models")
    await faceapi.nets.faceRecognitionNet.loadFromUri("/models")
  } catch (error) {
    console.error("Error loading face-api models:", error)
    showMessage("Error loading face recognition models. Please try again.", "red")
  }
}

async function captureImage() {
  try {
    const detections = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (detections) {
      const displaySize = { width: video.width, height: video.height }
      const resizedDetections = faceapi.resizeResults(detections, displaySize)

      canvas.width = video.width
      canvas.height = video.height
      faceapi.draw.drawDetections(canvas, resizedDetections)

      capturedImage = canvas.toDataURL("image/jpeg")
      faceDescriptor = detections.descriptor
      showMessage("Face captured successfully!", "green")
    } else {
      showMessage("No face detected. Please try again.", "red")
    }
  } catch (error) {
    console.error("Error capturing image:", error)
    showMessage("Error capturing image. Please try again.", "red")
  }
}

async function register() {
  if (!capturedImage || !faceDescriptor) {
    showMessage("Please capture your face first.", "red")
    return
  }

  const email = document.getElementById("email").value
  const fullName = document.getElementById("fullName").value
  const parentPhone = document.getElementById("parentPhone").value

  if (!email || !fullName || !parentPhone) {
    showMessage("Please fill in all fields.", "red")
    return
  }

  try {
    const response = await fetch("/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        fullName,
        parentPhone,
        faceDescriptor: Array.from(faceDescriptor),
        capturedImage,
      }),
    })

    const result = await response.json()
    showMessage(result.message, result.success ? "green" : "red")
  } catch (error) {
    console.error("Error during registration:", error)
    showMessage("Registration failed. Please try again.", "red")
  }
}

async function login() {
  if (!faceDescriptor) {
    showMessage("Please capture your face first.", "red")
    return
  }

  const email = document.getElementById("email").value

  if (!email) {
    showMessage("Please enter your email.", "red")
    return
  }

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        faceDescriptor: Array.from(faceDescriptor),
      }),
    })

    const result = await response.json()
    showMessage(result.message, result.success ? "green" : "red")

    if (result.success) {
      // Redirect to dashboard or perform other actions
      window.location.href = "/dashboard"
    }
  } catch (error) {
    console.error("Error during login:", error)
    showMessage("Login failed. Please try again.", "red")
  }
}

function showMessage(message, color) {
  const messageElement = document.getElementById("message")
  messageElement.textContent = message
  messageElement.style.color = color
}

