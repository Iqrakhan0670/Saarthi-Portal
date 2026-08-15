"use client"

import { useState, useEffect, useRef } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { 
  User, 
  Settings, 
  Briefcase, 
  LogOut, 
  Menu, 
  X, 
  LayoutDashboard, 
  PlusCircle, 
  MessageSquare,
  Calendar
} from "lucide-react"

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSignInOpen, setIsSignInOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userType, setUserType] = useState(null)
  const [userData, setUserData] = useState(null)
  
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [targetUserType, setTargetUserType] = useState(null)
  
  const location = useLocation()
  const navigate = useNavigate()
  const dropdownRef = useRef(null)

  // 1. Improved Authentication Check (Reads from 'user' object like Login.jsx)
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token")
      const storedUser = localStorage.getItem("user")

      if (token && storedUser) {
        try {
          const user = JSON.parse(storedUser)
          setIsLoggedIn(true)
          setUserData(user)

          // Normalize role check
          const role = user.role?.toLowerCase()
          if (role === 'job_poster' || role === 'recruiter' || role === 'poster') {
            setUserType('job_poster')
          } else {
            setUserType('job_seeker')
          }
        } catch (error) {
          console.error("Error parsing user data:", error)
          setIsLoggedIn(false)
          setUserType(null)
        }
      } else {
        setIsLoggedIn(false)
        setUserType(null)
      }
    }

    checkAuth()
    
    // Listen for storage changes (sync tabs)
    window.addEventListener("storage", checkAuth)
    return () => window.removeEventListener("storage", checkAuth)
  }, [location])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false)
        setIsSignInOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setIsLoggedIn(false)
    setUserType(null)
    setUserData(null)
    setIsProfileOpen(false)
    navigate("/login")
  }

  const handleCrossUserTypeClick = (e, targetType) => {
    e.preventDefault()
    if (isLoggedIn && userType !== targetType) {
      setTargetUserType(targetType)
      setShowSignOutModal(true)
    } else {
      navigate("/login")
    }
  }

  const handleSignOutAndRedirect = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setIsLoggedIn(false)
    setShowSignOutModal(false)
    navigate("/login")
  }

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="w-full">
          <div className="flex justify-between items-center h-16 px-4 max-w-7xl mx-auto">
            
            {/* Logo Section */}
            <button
              onClick={() => {
                if (isLoggedIn && userType === "job_poster") {
                  navigate("/poster-dashboard") // Redirect Poster to Dashboard
                } else if (isLoggedIn && userType === "job_seeker") {
                  navigate("/dashboard") // Redirect Seeker to Dashboard
                } else {
                  navigate("/") // Redirect Guest to Home
                }
              }}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-blue-800 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-700">Talent Corner</span>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              
              {/* --- NEW DASHBOARD LINK FOR SEEKERS --- */}
              {isLoggedIn && userType === "job_seeker" && (
                <Link to="/dashboard" className="text-gray-700 hover:text-blue-800 transition-colors font-medium">
                  Dashboard
                </Link>
              )}

              {/* Link: Find Jobs (Seekers & Guests) */}
              {(!isLoggedIn || userType === "job_seeker") && (
                <Link to="/jobs" className="text-gray-700 hover:text-blue-800 transition-colors font-medium">
                  Find Jobs
                </Link>
              )}

              {/* Link: Find Candidates (Posters Only) */}
              {isLoggedIn && userType === "job_poster" && (
                <Link to="/find-candidate" className="text-gray-700 hover:text-blue-800 transition-colors font-medium">
                  Find Candidates
                </Link>
              )}

              {/* Link: Post a Job (Posters Only) */}
              {isLoggedIn && userType === "job_poster" && (
                <Link to="/posting-job" className="text-gray-700 hover:text-blue-800 transition-colors font-medium">
                  Post a Job
                </Link>
              )}

              {isLoggedIn && (
                <Link to="/calendar" className="text-gray-700 hover:text-blue-800 transition-colors font-medium">
                  Calendar
                </Link>
              )}

              {/* Link: Switch to Employer View (Guests/Seekers) */}
              {(!isLoggedIn || userType === "job_seeker") && (
                <button
                  onClick={(e) => handleCrossUserTypeClick(e, "job_poster")}
                  className="text-gray-700 hover:text-blue-800 transition-colors font-medium"
                >
                  Employers / Post Job
                </button>
              )}

              {/* AUTH BUTTONS */}
              {!isLoggedIn ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
                    onClick={() => setIsSignInOpen(!isSignInOpen)}
                  >
                    Sign In
                  </button>
                  {isSignInOpen && (
                    <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-lg shadow-xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2">
                      <Link 
                        to="/login" 
                        onClick={() => setIsSignInOpen(false)}
                        className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      >
                        Log In
                      </Link>
                      <Link 
                        to="/signup" 
                        onClick={() => setIsSignInOpen(false)}
                        className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      >
                        Sign Up
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                /* LOGGED IN USER DROPDOWN */
                <div className="relative" ref={dropdownRef}>
                  <button
                    className="flex items-center gap-2 text-gray-700 hover:text-blue-800 transition-colors focus:outline-none"
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                  >
                    <div className="w-9 h-9 bg-blue-100 border border-blue-200 rounded-full flex items-center justify-center">
                      <span className="text-blue-800 font-bold">
                        {userData?.name ? userData.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                      </span>
                    </div>
                    <span className="font-medium max-w-[100px] truncate hidden lg:block">
                      {userData?.name}
                    </span>
                  </button>

                  {isProfileOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2">
                      
                      {/* JOB POSTER MENU */}
                      {userType === "job_poster" ? (
                        <>
                          <div className="px-4 py-2 border-b border-gray-100 mb-1">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Employer</p>
                          </div>
                          <Link to="/poster-dashboard" onClick={() => setIsProfileOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                            <LayoutDashboard className="w-4 h-4 mr-3" /> Dashboard
                          </Link>
                          <Link to="/calendar" onClick={() => setIsProfileOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                            <Calendar className="w-4 h-4 mr-3" /> Calendar
                          </Link>
                          <Link to="/posting-job" onClick={() => setIsProfileOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                            <PlusCircle className="w-4 h-4 mr-3" /> Post a Job
                          </Link>
                          <Link to="/poster-profile" onClick={() => setIsProfileOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                            <User className="w-4 h-4 mr-3" /> Company Profile
                          </Link>
                          <Link to="/poster-message" onClick={() => setIsProfileOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                            <MessageSquare className="w-4 h-4 mr-3" /> Messages
                          </Link>
                          <Link to="/poster-settings" onClick={() => setIsProfileOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                            <Settings className="w-4 h-4 mr-3" /> Settings
                          </Link>
                        </>
                      ) : (
                        /* JOB SEEKER MENU - UPDATED WITH DASHBOARD */
                        <>
                          <div className="px-4 py-2 border-b border-gray-100 mb-1">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Job Seeker</p>
                          </div>
                          
                          {/* NEW DASHBOARD LINK IN DROPDOWN */}
                          <Link to="/dashboard" onClick={() => setIsProfileOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                            <LayoutDashboard className="w-4 h-4 mr-3" /> Dashboard
                          </Link>
                          <Link to="/calendar" onClick={() => setIsProfileOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                            <Calendar className="w-4 h-4 mr-3" /> Calendar
                          </Link>

                          <Link to="/profile" onClick={() => setIsProfileOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                            <User className="w-4 h-4 mr-3" /> My Profile
                          </Link>
                          <Link to="/my-jobs" onClick={() => setIsProfileOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                            <Briefcase className="w-4 h-4 mr-3" /> My Jobs
                          </Link>
                          <Link to="/applicant-messages" onClick={() => setIsProfileOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                            <MessageSquare className="w-4 h-4 mr-3" /> Messages
                          </Link>
                          <Link to="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600">
                            <Settings className="w-4 h-4 mr-3" /> Settings
                          </Link>
                        </>
                      )}

                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4 mr-3" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button 
                className="p-2 text-gray-700 hover:text-blue-800 rounded-lg hover:bg-gray-50" 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-gray-200 bg-white">
              <div className="px-4 pt-2 pb-4 space-y-1">
                {(!isLoggedIn || userType === "job_seeker") && (
                   <Link to="/jobs" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-800 hover:bg-gray-50">Find Jobs</Link>
                )}
                
                {isLoggedIn ? (
                  <>
                    <div className="border-t border-gray-200 my-2"></div>
                    <Link to="/calendar" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50">Calendar</Link>
                    {userType === "job_poster" ? (
                       <>
                         <Link to="/poster-dashboard" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50">Dashboard</Link>
                         <Link to="/posting-job" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50">Post a Job</Link>
                         <Link to="/poster-profile" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50">Company Profile</Link>
                       </>
                    ) : (
                       /* MOBILE SEEKER MENU - UPDATED */
                       <>
                         <Link to="/dashboard" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50">Dashboard</Link>
                         <Link to="/profile" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50">My Profile</Link>
                         <Link to="/my-jobs" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50">My Jobs</Link>
                       </>
                    )}
                    <button onClick={handleLogout} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50">Sign Out</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50">Log In</Link>
                    <Link to="/signup" className="block px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:bg-blue-50">Sign Up</Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Switch User Modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowSignOutModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full z-10">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Switch User Type?</h3>
            <p className="text-gray-600 mb-6 text-sm">
              You are currently logged in as a <strong>{userType === "job_seeker" ? "Job Seeker" : "Employer"}</strong>. 
              To access the {targetUserType === "job_poster" ? "Employer" : "Job Seeker"} area, you need to sign out first.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignOutModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOutAndRedirect}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Sign Out & Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar