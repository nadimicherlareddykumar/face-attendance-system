import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FaBars, FaUserShield, FaUserGraduate, FaTimes } from "react-icons/fa";

const Front = () => {
  const [recognizedName, setRecognizedName] = useState("USN will appear here");
  const [recognizedStudentName, setRecognizedStudentName] = useState("Name will appear here");
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [students, setStudents] = useState([]);
  const [isAutoMode, setIsAutoMode] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false); // Menu state
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const recentDetections = useRef(new Map()); // Buffer for stable display
  const markedStudents = useRef(new Map()); // Map<USN, timestamp> - Cooldown for API calls

  // Fetch students and initial attendance count
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Students
        const studentRes = await axios.get("http://localhost:5001/api/students");
        setStudents(studentRes.data);



      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const getCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Camera access error:", err);
        toast.error("Could not access camera");
      }
    };

    getCamera();
  }, []);

  // Auto-Attendance Interval
  useEffect(() => {
    let interval;
    if (isAutoMode) {
      interval = setInterval(() => {
        handleRecognize(true); // Pass true for auto mode
      }, 5000); // Run every 5 seconds
    }
    return () => clearInterval(interval);
  }, [isAutoMode, students]);

  const handleRecognize = async (isAuto = false) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!videoRef.current || !canvas) return;

    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/jpeg");

    try {
      const response = await axios.post("http://localhost:5006/recognize", { image: imageData });
      const results = response.data;

      const now = Date.now();

      // 1. Update Buffer with new detections
      if (results.length > 0) {
        for (const result of results) {
          const usn = result.usn;
          if (usn === "Unknown") continue;

          const matchedStudent = students.find((student) => student.usn === usn);
          const name = matchedStudent ? matchedStudent.name : "Unknown";

          // Add/Update in buffer
          recentDetections.current.set(usn, { name, timestamp: now });
        }
      }

      // 2. Clean up old entries (older than 3 seconds)
      for (const [key, value] of recentDetections.current.entries()) {
        if (now - value.timestamp > 3000) {
          recentDetections.current.delete(key);
        }
      }

      // 3. Update Display from Buffer
      if (recentDetections.current.size > 0) {
        const allUsns = Array.from(recentDetections.current.keys());
        const allNames = Array.from(recentDetections.current.values()).map(v => v.name);

        setRecognizedName(allUsns.join(", "));
        setRecognizedStudentName(allNames.join(", "));
      } else {
        setRecognizedName("No face detected");
        setRecognizedStudentName("");
        if (!isAuto && results.length === 0) toast.error("No face detected");
      }

      // 4. Handle Attendance (Only for CURRENTLY detected faces)
      let successCount = 0;
      let newAttendanceMarked = false;
      const COOLDOWN_PERIOD = 10 * 60 * 1000; // 10 minutes

      for (const result of results) {
        const usn = result.usn;
        if (usn === "Unknown") continue;

        // Check cooldown
        const lastMarked = markedStudents.current.get(usn);
        if (lastMarked && (now - lastMarked < COOLDOWN_PERIOD)) {
          console.log(`Skipping attendance for ${usn} (Cooldown active)`);
          continue;
        }

        const matchedStudent = students.find((student) => student.usn === usn);
        const recognizedAt = new Date().toISOString();

        try {
          const res = await axios.post("http://localhost:5001/api/periodwise-attendance", {
            usn,
            recognizedAt
          });

          // If marked (201) or already recorded (200), update cooldown
          if (res.status === 201 || res.status === 200) {
            markedStudents.current.set(usn, now);
          }

          if (res.status === 201) {
            successCount++;
            newAttendanceMarked = true;
            toast.success(`Marked: ${matchedStudent ? matchedStudent.name : usn}`);
          }
        } catch (err) {
          // Error handling
        }
      }

      if (successCount > 0) {
        setAttendanceMessage(`Attendance marked for ${successCount} student(s).`);
      } else if (recentDetections.current.size > 0) {
        setAttendanceMessage("Attendance already recorded.");
      } else {
        setAttendanceMessage("");
      }



      // Clear canvas
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    } catch (err) {
      console.error(err);
      setRecognizedName("Error");
      setRecognizedStudentName("Error");
      setAttendanceMessage("Error in recognition.");
      if (!isAuto) toast.error("Recognition failed");
    }
  };

  return (
    <div className="absolute inset-0 -z-10 h-full w-full items-center px-5 py-24 [background:radial-gradient(125%_125%_at_50%_10%,#000_40%,#63e_100%)]">

      {/* Total Present Counter Badge */}


      {/* Hamburger Menu (Top Right) */}
      <div className="absolute top-5 right-5 z-50">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-full text-white hover:bg-white/20 transition-all shadow-lg"
        >
          {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-2xl overflow-hidden animate-fade-in origin-top-right">
            <div className="py-1">
              <Link to="/Signin" className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors gap-3">
                <FaUserShield className="text-purple-600" />
                <span className="font-medium">Admin Login</span>
              </Link>
              <Link to="/student-portal" className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors gap-3 border-t border-gray-100">
                <FaUserGraduate className="text-blue-600" />
                <span className="font-medium">Student Portal</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col sm:flex-row gap-5 w-full h-[80vh] p-5">
          <div className="w-1/2 h-full flex items-center justify-center">
            <div className="w-full max-w-2xl aspect-video bg-black rounded-2xl shadow-2xl overflow-hidden border-2 border-[#E8E4FF] relative">
              <video ref={videoRef} autoPlay muted className="w-full h-full object-cover absolute top-0 left-0" />
              <canvas ref={canvasRef} width="640" height="480" className="hidden"></canvas>

              {isAutoMode && (
                <div className="absolute top-4 right-4 bg-green-500/80 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                  AUTO MODE ON
                </div>
              )}

              <div className="absolute top-4 left-4 bg-blue-500/80 text-white px-3 py-1 rounded-full text-sm font-bold">
                FaceNet Enhanced
              </div>
            </div>
          </div>

          <div className="w-1/2 h-full flex flex-col items-center justify-center text-center">
            <h1 className="text-5xl font-bold text-white drop-shadow-md mb-6">
              Student Attendance System
            </h1>

            <div className="mt-5 text-2xl font-medium text-gray-300">
              Recognized USN: <span className="text-emerald-400 font-bold">{recognizedName}</span>
            </div>
            <div className="mt-5 text-2xl font-medium text-gray-300">
              Recognized Student Name: <span className="text-emerald-400 font-bold">{recognizedStudentName}</span>
            </div>

            {/* Display the attendance message */}
            {attendanceMessage && (
              <div className="mt-5 text-lg font-medium text-yellow-300">
                {attendanceMessage}
              </div>
            )}
            <div className="flex flex-row gap-3 flex-wrap justify-center">
              <button
                onClick={() => handleRecognize(false)}
                className="mt-8 transition-background inline-flex h-12 items-center justify-center rounded-xl border border-gray-800 bg-gradient-to-r from-gray-100 via-[#c7d2fe] to-[#8678f9] bg-[length:200%_200%] bg-[0%_0%] px-6 font-medium text-gray-950 duration-500 hover:bg-[100%_200%] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-50"
              >
                Recognize Face
              </button>

              <button
                onClick={() => setIsAutoMode(!isAutoMode)}
                className={`mt-8 transition-all inline-flex h-12 items-center justify-center rounded-xl border border-gray-800 px-6 font-medium text-white duration-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-50 ${isAutoMode ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {isAutoMode ? "Stop Auto Mode" : "Start Auto Mode"}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Front;
