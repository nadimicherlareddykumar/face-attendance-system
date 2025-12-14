import "./App.css";
import { FaHome, FaFileAlt, FaUser, FaDownload, FaClock } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import axios from 'axios';
import React, { useState, useEffect, useRef } from 'react';

const Addstudent = () => {
  const [student, setStudent] = useState({
    name: '',
    usn: '',
    age: '',
    course: '',
    phone: ''
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleChange = (e) => {
    setStudent({ ...student, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      // Preview the first file
      setPreviewUrl(URL.createObjectURL(files[0]));
    }
  };

  const handleEnrollment = async () => {
    if (!student.name || !student.usn || !student.age || !student.course || !student.phone || selectedFiles.length === 0) {
      alert("Please fill in all details and upload at least one photo.");
      return;
    }

    setIsEnrolling(true);

    try {
      // Helper to convert file to base64
      const toBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });

      // Convert all files
      const base64Images = await Promise.all(selectedFiles.map(toBase64));

      // Send to Python API
      const response = await fetch('http://localhost:5006/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usn: student.usn, images: base64Images })
      });

      if (response.ok) {
        // Save student details to Node.js backend (use the first image as profile pic)
        const dataResponse = await fetch('http://localhost:5001/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...student, image: base64Images[0] })
        });

        if (dataResponse.ok) {
          alert(`Successfully enrolled ${student.name}!`);
          setStudent({ name: '', age: '', course: '', phone: '', usn: '' });
          setSelectedFiles([]);
          setPreviewUrl(null);
        } else {
          alert("Failed to save student details.");
        }
      } else {
        alert("Failed to enroll face. Please try a clearer photo.");
      }
      setIsEnrolling(false);

    } catch (err) {
      console.error('Error during enrollment:', err);
      alert("Enrollment failed. Please check the console.");
      setIsEnrolling(false);
    }
  };

  return (
    <div className="min-h-screen p-4 bg-split">
      <div className="flex flex-col lg:flex-row gap-6">


        <div className="w-full lg:w-64 bg-white shadow-xl rounded-2xl p-4 flex flex-col justify-between min-h-[90vh]">
          <div>
            <h2 className="text-xl font-semibold text-center mb-6">Admin Page</h2>
            <div className="flex flex-col gap-5">
              <Link to="/dashboard">
                <button className="flex items-center space-x-2 w-full text-left py-2 px-4 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-all duration-300">
                  <FaHome className="text-purple-600" />
                  <span>Home</span>
                </button>
              </Link>
              <Link to="/Addstudent">
                <button className="flex items-center space-x-2 w-full text-left py-2 px-4 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-all duration-300">
                  <FaUser className="text-black" />
                  <span>Add Students</span>
                </button>
              </Link>
              <Link to="/Enrolled">
                <button className="flex items-center space-x-2 w-full text-left py-2 px-4 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-all duration-300">
                  <FaFileAlt className="text-red-500" />
                  <span>Enrolled</span>
                </button>
              </Link>
            </div>
          </div>
          <Link to='/signin'>
            <button className="w-full py-2 rounded-xl bg-[#1E2A78] text-white shadow-md flex items-center justify-center space-x-2 hover:bg-[#16239D] active:bg-[#0f1c77] transition-all duration-300">
              <FaDownload />
              <span>LogOut</span>
            </button></Link>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center text-white mt-2 gap-4">

          </div>

          <div className="bg-white rounded-[1.1rem] shadow-md p-4">
            <h1 className="text-gray-900 font-semibold mb-4 ml-2">Add Students Here</h1>
            <div className="w-full grid gap-5 grid-cols-2 mt-5 p-5">
              <input type="text" name="name" value={student.name} onChange={handleChange} className="placeholder:text-gray-700 rounded-xl bg-[#F7F7F7] px-4 py-2" placeholder="Enter the student's name" />
              <input type="text" name="usn" value={student.usn} onChange={handleChange} className="placeholder:text-gray-700 rounded-xl bg-[#F7F7F7] px-4 py-2" placeholder="Enter the USN" />
              <input type="text" name="age" value={student.age} onChange={handleChange} className="placeholder:text-gray-700 rounded-xl bg-[#F7F7F7] px-4 py-2" placeholder="Enter the age" />
              <input type="text" name="course" value={student.course} onChange={handleChange} className="placeholder:text-gray-700 rounded-xl bg-[#F7F7F7] px-4 py-2" placeholder="Enter the course" />
              <input type="number" name="phone" value={student.phone} onChange={handleChange} className="placeholder:text-gray-700 rounded-xl bg-[#F7F7F7] px-4 py-2" placeholder="Enter the mobile number" />
            </div>

            {/* File Upload & Preview */}
            <div className='flex flex-col lg:flex-row w-full gap-4 mt-6'>
              <div className='w-full lg:w-1/2 h-[53vh] bg-white/20 backdrop-blur-lg border border-gray-50 rounded-2xl p-2 flex justify-center items-center overflow-hidden relative'>
                <div className="w-full h-full bg-gray-100 rounded-2xl shadow-inner flex items-center justify-center overflow-hidden">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-gray-400 text-center">
                      <FaUser size={48} className="mx-auto mb-2" />
                      <p>No Image Selected</p>
                    </div>
                  )}
                </div>
                <label className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg cursor-pointer hover:bg-gray-50 transition">
                  <span className="text-sm font-semibold text-gray-700">Select Photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className='w-full lg:w-1/2 flex flex-col justify-start mt-5 items-center text-center'>
                <h1 className='text-gray-800 font-bold text-[1.5rem] mb-4'>Upload Student Photos</h1>
                <p className="text-gray-500 mb-6">Please upload clear, front-facing photos (e.g., 3 different angles) for best recognition results.</p>
                <div className="mb-4 text-sm text-blue-600 font-medium">
                  {selectedFiles.length > 0 ? `${selectedFiles.length} photos selected` : 'No photos selected'}
                </div>
                <button
                  onClick={handleEnrollment}
                  disabled={isEnrolling}
                  className={`w-sm rounded-xl px-8 py-3 font-bold text-white transition-all hover:opacity-90 hover:shadow-lg ${isEnrolling ? 'bg-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-700 to-blue-600'}`}>
                  {isEnrolling ? 'Enrolling...' : 'Enroll Student'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Addstudent;
