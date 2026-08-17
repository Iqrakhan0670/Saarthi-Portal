import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  MapPin,
  User,
  Plus,
  Edit,
  Trash2,
  X,
  CheckCircle,
  AlertTriangle,
  FileText,
  VideoOff,
  Search,
  Filter
} from "lucide-react";
import { getApiBaseUrl } from "../utils/apiConfig";

const API_BASE_URL = getApiBaseUrl();

const CalendarPage = () => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState(null); // 'job_seeker' or 'job_poster'
  const [interviews, setInterviews] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Calendar Navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedView, setSelectedView] = useState("month"); // 'month', 'week', 'day', 'year'
  
  // Modals & Details
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State
  const [formCandidateId, setFormCandidateId] = useState("");
  const [formTitle, setFormTitle] = useState("Job Interview");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formMode, setFormMode] = useState("Online");
  const [formLink, setFormLink] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formInterviewer, setFormInterviewer] = useState("");
  const [formStatus, setFormStatus] = useState("Scheduled");
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'Scheduled', 'Completed', 'Cancelled'
  
  const today = new Date();

  // 1. Determine user type and fetch data
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/login");
      return;
    }
    try {
      const user = JSON.parse(storedUser);
      const role = user.role?.toLowerCase();
      if (role === 'job_poster' || role === 'recruiter' || role === 'poster') {
        setUserType('job_poster');
      } else {
        setUserType('job_seeker');
      }
    } catch (err) {
      console.error("Error decoding user role:", err);
      navigate("/login");
    }
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found.");

      // Fetch interviews
      const res = await fetch(`${API_BASE_URL}/api/scheduled-interviews`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch scheduled interviews");
      const data = await res.json();
      setInterviews(data);

      // If employer, fetch candidates to populate the schedule dropdown
      const storedUser = localStorage.getItem("user");
      const user = JSON.parse(storedUser);
      const role = user.role?.toLowerCase();
      if (role === 'job_poster' || role === 'recruiter' || role === 'poster') {
        const jobsRes = await fetch(`${API_BASE_URL}/api/jobs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (jobsRes.ok) {
          const jobs = await jobsRes.json();
          let allApps = [];
          for (const job of jobs) {
            const appsRes = await fetch(`${API_BASE_URL}/api/applications/${job.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (appsRes.ok) {
              const apps = await appsRes.json();
              allApps = allApps.concat(
                apps.map(app => ({
                  id: app.id,
                  name: app.applicant_name,
                  position: job.job_title,
                  email: app.applicant_email,
                  phone: app.applicant_phone || app.applicant_mobile
                }))
              );
            }
          }
          setCandidates(allApps);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userType) {
      fetchData();
    }
  }, [userType]);

  // Helper date parsing/formatting utilities
  const formatDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const parseSqlDateString = (dateStr) => {
    if (!dateStr) return null;
    const cleanStr = dateStr.split('T')[0];
    const parts = cleanStr.split('-');
    return new Date(parts[0], parts[1] - 1, parts[2]);
  };

  // Group events by date key
  const filteredInterviews = (Array.isArray(interviews) ? interviews : []).filter(inv => {
  if (statusFilter === "all") return true;
  return inv.status === statusFilter;
});

  const getInterviewsForDate = (date) => {
    const targetKey = formatDateKey(date);
    return filteredInterviews.filter(inv => {
      if (!inv.interview_date) return false;
      const invKey = inv.interview_date.split('T')[0];
      return invKey === targetKey;
    });
  };

  // Previous & Next navigation handler
  const handlePrev = () => {
    const copy = new Date(currentDate);
    if (selectedView === "month") {
      copy.setMonth(copy.getMonth() - 1);
    } else if (selectedView === "week") {
      copy.setDate(copy.getDate() - 7);
    } else if (selectedView === "day") {
      copy.setDate(copy.getDate() - 1);
    } else if (selectedView === "year") {
      copy.setFullYear(copy.getFullYear() - 1);
    }
    setCurrentDate(copy);
  };

  const handleNext = () => {
    const copy = new Date(currentDate);
    if (selectedView === "month") {
      copy.setMonth(copy.getMonth() + 1);
    } else if (selectedView === "week") {
      copy.setDate(copy.getDate() + 7);
    } else if (selectedView === "day") {
      copy.setDate(copy.getDate() + 1);
    } else if (selectedView === "year") {
      copy.setFullYear(copy.getFullYear() + 1);
    }
    setCurrentDate(copy);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Date generators for grids
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    const days = [];
    // Prev month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false
      });
    }
    // Current month days
    for (let i = 1; i <= daysCount; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    // Next month padding
    const totalDays = 42; // standard 6 rows
    const remaining = totalDays - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    return days;
  };

  const getDaysInWeek = (date) => {
    const current = new Date(date);
    const day = current.getDay();
    const diff = current.getDate() - day;
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(current.setDate(diff + i));
      days.push(d);
    }
    return days;
  };

  // Form Handlers
  const handleOpenScheduleModal = (dateStr = null) => {
    if (userType !== 'job_poster') return;
    setIsEditing(false);
    setFormCandidateId("");
    setFormTitle("Job Interview");
    setFormDate(dateStr || formatDateKey(new Date()));
    setFormTime("10:00");
    setFormMode("Online");
    setFormLink("");
    setFormNotes("");
    setFormInterviewer("");
    setFormStatus("Scheduled");
    setShowScheduleModal(true);
  };

  const handleOpenEditModal = (interview) => {
    if (userType !== 'job_poster') return;
    setIsEditing(true);
    setSelectedInterview(interview);
    setFormCandidateId(interview.application_id);
    setFormTitle(interview.interview_title || "Job Interview");
    setFormDate(interview.interview_date.split('T')[0]);
    // MySQL TIME field formatting check
    setFormTime(interview.interview_time.substring(0, 5));
    setFormMode(interview.interview_mode || "Online");
    setFormLink(interview.meeting_link || "");
    setFormNotes(interview.notes || "");
    setFormInterviewer(interview.interviewer || "");
    setFormStatus(interview.status || "Scheduled");
    setShowDetailModal(false);
    setShowScheduleModal(true);
  };

  const handleSaveInterview = async (e) => {
    e.preventDefault();
    if (!formCandidateId || !formDate || !formTime) {
      alert("Candidate, date, and time are required.");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const url = isEditing 
        ? `${API_BASE_URL}/api/scheduled-interviews/${selectedInterview.id}`
        : `${API_BASE_URL}/api/scheduled-interviews`;
      
      const method = isEditing ? "PUT" : "POST";

      const body = {
        application_id: formCandidateId,
        interview_date: formDate,
        interview_time: formTime,
        interview_title: formTitle,
        interview_mode: formMode,
        meeting_link: formLink || null,
        notes: formNotes || null,
        interviewer: formInterviewer || null,
        status: formStatus
      };

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to save interview");
      }

      setShowScheduleModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancelInterview = async (id) => {
    if (!window.confirm("Are you sure you want to completely remove this interview from the schedule?")) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/scheduled-interviews/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to delete interview");
      
      setShowDetailModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // View switch renderers
  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      <div>
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-sm font-semibold text-gray-500">
          {weekdays.map(d => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map(({ date, isCurrentMonth }, idx) => {
            const dateEvents = getInterviewsForDate(date);
            const isToday = formatDateKey(date) === formatDateKey(today);
            
            return (
              <div
                key={idx}
                onClick={() => {
                  if (userType === 'job_poster' && dateEvents.length === 0) {
                    handleOpenScheduleModal(formatDateKey(date));
                  }
                }}
                className={`min-h-[110px] bg-white border border-gray-100 rounded-xl p-2 transition-all hover:shadow-md flex flex-col justify-between cursor-pointer ${
                  !isCurrentMonth ? "opacity-40" : ""
                } ${isToday ? "ring-2 ring-blue-500 bg-blue-50/20" : ""}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-sm font-semibold ${isToday ? "bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold" : "text-gray-700"}`}>
                    {date.getDate()}
                  </span>
                  {userType === 'job_poster' && isCurrentMonth && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenScheduleModal(formatDateKey(date));
                      }}
                      className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition-colors"
                      title="Schedule Interview"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex-1 space-y-1 overflow-y-auto max-h-[80px] scrollbar-thin">
                  {dateEvents.map(event => {
                    const statusColors = {
                      Scheduled: "bg-blue-50 text-blue-700 border-blue-600",
                      Completed: "bg-green-50 text-green-700 border-green-600",
                      Cancelled: "bg-red-50 text-red-700 border-red-600"
                    };
                    const badgeColor = statusColors[event.status] || "bg-gray-50 text-gray-700 border-gray-400";
                    
                    return (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInterview(event);
                          setShowDetailModal(true);
                        }}
                        className={`text-xs p-1.5 rounded-lg border-l-4 font-medium truncate shadow-sm transition-transform hover:scale-[1.02] ${badgeColor}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold truncate">{event.interview_title}</span>
                          <span className="text-[10px] opacity-75">{event.interview_time.substring(0, 5)}</span>
                        </div>
                        <div className="text-[10px] opacity-80 truncate">
                          {userType === 'job_poster' ? event.applicant_name : event.company_name || "Company"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getDaysInWeek(currentDate);
    const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Week view header */}
          <div className="grid grid-cols-8 border-b border-gray-100 pb-3 mb-2 text-center">
            <div className="text-sm font-semibold text-gray-500 py-2">Time</div>
            {weekDays.map((date, idx) => {
              const isToday = formatDateKey(date) === formatDateKey(today);
              return (
                <div key={idx} className={`py-2 px-1 rounded-xl ${isToday ? "bg-blue-50 ring-1 ring-blue-500/30" : ""}`}>
                  <p className="text-xs font-semibold text-gray-400">
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  <p className={`text-base font-bold ${isToday ? "text-blue-600" : "text-gray-700"}`}>
                    {date.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Time slot rows */}
          <div className="divide-y divide-gray-50">
            {timeSlots.map(time => (
              <div key={time} className="grid grid-cols-8 min-h-[70px] items-start py-2">
                <div className="text-xs font-semibold text-gray-400 text-center py-2">{time}</div>
                {weekDays.map((date, idx) => {
                  const dateEvents = getInterviewsForDate(date).filter(
                    inv => inv.interview_time.substring(0, 2) === time.substring(0, 2)
                  );
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (userType === 'job_poster' && dateEvents.length === 0) {
                          handleOpenScheduleModal(`${formatDateKey(date)}`);
                          setFormTime(time);
                        }
                      }}
                      className="border-l border-gray-100 min-h-[60px] p-1 space-y-1 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      {dateEvents.map(event => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInterview(event);
                            setShowDetailModal(true);
                          }}
                          className={`text-xs p-1.5 rounded-lg border-l-4 font-medium shadow-sm truncate ${
                            event.status === 'Completed' ? "bg-green-50 text-green-700 border-green-600" :
                            event.status === 'Cancelled' ? "bg-red-50 text-red-700 border-red-600" :
                            "bg-blue-50 text-blue-700 border-blue-600"
                          }`}
                        >
                          <p className="font-bold truncate">{event.interview_title}</p>
                          <p className="text-[10px] opacity-80 truncate">
                            {userType === 'job_poster' ? event.applicant_name : event.company_name || "Company"}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const timeSlots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
    const dateEvents = getInterviewsForDate(currentDate);

    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 rounded-2xl p-6 border border-blue-100/30 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-1">
            {currentDate.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
          <p className="text-sm text-gray-600">
            You have {dateEvents.length} interview(s) scheduled for this day.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {timeSlots.map(time => {
            const slotEvents = dateEvents.filter(
              inv => inv.interview_time.substring(0, 2) === time.substring(0, 2)
            );

            return (
              <div key={time} className="flex py-4 items-start gap-4">
                <span className="text-sm font-semibold text-gray-400 w-16 text-right pt-1">{time}</span>
                <div className="flex-1 min-h-[50px] border-l-2 border-gray-100 pl-4 space-y-2">
                  {slotEvents.length > 0 ? (
                    slotEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={() => {
                          setSelectedInterview(event);
                          setShowDetailModal(true);
                        }}
                        className={`p-4 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex justify-between items-center ${
                          event.status === 'Completed' ? "bg-green-50 text-green-700 border-green-600" :
                          event.status === 'Cancelled' ? "bg-red-50 text-red-700 border-red-600" :
                          "bg-blue-50 text-blue-700 border-blue-600"
                        }`}
                      >
                        <div>
                          <h4 className="font-bold text-sm md:text-base">{event.interview_title}</h4>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-90 mt-1">
                            <span className="flex items-center gap-1 font-semibold">
                              <User className="w-3.5 h-3.5" />
                              {userType === 'job_poster' 
                                ? `Candidate: ${event.applicant_name}` 
                                : `Interviewer: ${event.interviewer || event.company_name || 'HR Team'}`}
                            </span>
                            <span className="flex items-center gap-1">
                              {event.interview_mode === 'Online' ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                              {event.interview_mode} Mode
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/70 shadow-sm">
                          {event.interview_time.substring(0, 5)}
                        </span>
                      </div>
                    ))
                  ) : (
                    userType === 'job_poster' && (
                      <button
                        onClick={() => {
                          handleOpenScheduleModal(formatDateKey(currentDate));
                          setFormTime(time);
                        }}
                        className="text-xs text-gray-400 hover:text-blue-600 py-2 inline-flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Add interview at {time}
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const year = currentDate.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {months.map((monthDate, mIdx) => {
          const monthName = monthDate.toLocaleDateString("en-US", { month: "long" });
          const daysInMonth = new Date(year, mIdx + 1, 0).getDate();
          const firstDay = new Date(year, mIdx, 1).getDay();
          
          const days = [];
          for (let i = 0; i < firstDay; i++) days.push(null);
          for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, mIdx, i));

          return (
            <div key={mIdx} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-3 text-center">{monthName}</h4>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 mb-1">
                <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {days.map((dayDate, dIdx) => {
                  if (!dayDate) return <div key={dIdx} className="h-6"></div>;
                  const dayEvents = getInterviewsForDate(dayDate);
                  const isToday = formatDateKey(dayDate) === formatDateKey(today);
                  
                  let cellStyle = "h-6 flex items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer ";
                  if (dayEvents.length > 0) {
                    const hasCancelled = dayEvents.every(e => e.status === 'Cancelled');
                    const hasCompleted = dayEvents.some(e => e.status === 'Completed');
                    if (hasCancelled) {
                      cellStyle += "bg-red-100 text-red-800 font-bold ";
                    } else if (hasCompleted) {
                      cellStyle += "bg-green-100 text-green-800 font-bold ";
                    } else {
                      cellStyle += "bg-blue-100 text-blue-800 font-bold ";
                    }
                  } else if (isToday) {
                    cellStyle += "bg-blue-600 text-white font-bold ";
                  } else {
                    cellStyle += "text-gray-700 ";
                  }

                  return (
                    <div
                      key={dIdx}
                      className={cellStyle}
                      onClick={() => {
                        setCurrentDate(dayDate);
                        setSelectedView("month");
                      }}
                      title={`${dayEvents.length} interview(s)`}
                    >
                      {dayDate.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Main Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
              <Calendar className="w-8 h-8 text-blue-800" />
              Interview Scheduler
            </h1>
            <p className="text-gray-500 mt-1">
              {userType === 'job_poster' 
                ? "Schedule and coordinate candidate interviews, link locations, and view timelines."
                : "View and keep track of your assigned company interviews and check connections."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter and Mode selector */}
            <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2 shadow-sm">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-semibold text-gray-600 focus:outline-none bg-transparent cursor-pointer"
              >
                <option value="all">All Interviews</option>
                <option value="Scheduled">Scheduled Only</option>
                <option value="Completed">Completed Only</option>
                <option value="Cancelled">Cancelled Only</option>
              </select>
            </div>

            {userType === 'job_poster' && (
              <button
                onClick={() => handleOpenScheduleModal()}
                className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md transition-all flex items-center gap-1.5 text-sm"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>Schedule Interview</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Navigation and Views Selector */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 md:p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                title="Previous"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              
              <button
                onClick={handleToday}
                className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 font-semibold text-sm text-gray-600 transition-colors"
              >
                Today
              </button>

              <button
                onClick={handleNext}
                className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                title="Next"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>

              <h2 className="text-xl font-bold text-gray-800 ml-2">
                {selectedView === 'month' && currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                {selectedView === 'week' && `Week of ${getDaysInWeek(currentDate)[0].getDate()} ${getDaysInWeek(currentDate)[0].toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                {selectedView === 'day' && currentDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                {selectedView === 'year' && currentDate.getFullYear()}
              </h2>
            </div>

            {/* View toggler */}
            <div className="bg-gray-100/80 p-1.5 rounded-xl flex items-center gap-1">
              {["month", "week", "day", "year"].map((viewOpt) => (
                <button
                  key={viewOpt}
                  onClick={() => setSelectedView(viewOpt)}
                  className={`px-4 py-2 rounded-lg font-semibold text-xs capitalize transition-all ${
                    selectedView === viewOpt
                      ? "bg-white text-gray-800 shadow-sm"
                      : "text-gray-500 hover:text-gray-800 hover:bg-white/30"
                  }`}
                >
                  {viewOpt}
                </button>
              ))}
            </div>
          </div>

          {/* Main Calendar Body rendering */}
          {loading ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-gray-400">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-800 mb-2"></div>
              <p className="text-sm font-medium">Loading scheduled interviews...</p>
            </div>
          ) : error ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-red-500">
              <AlertTriangle className="w-10 h-10 mb-2" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          ) : (
            <div>
              {selectedView === 'month' && renderMonthView()}
              {selectedView === 'week' && renderWeekView()}
              {selectedView === 'day' && renderDayView()}
              {selectedView === 'year' && renderYearView()}
            </div>
          )}
        </div>

        {/* Modal: Detailed Event Information */}
        {showDetailModal && selectedInterview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100">
              
              {/* Modal header */}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-4 flex justify-between items-center text-white">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-white/20 rounded">
                    Interview Details
                  </span>
                  <h3 className="text-lg font-bold mt-1">{selectedInterview.interview_title}</h3>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-bold uppercase">Date & Time</p>
                    <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-800" />
                      {new Date(selectedInterview.interview_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {selectedInterview.interview_time.substring(0, 5)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-bold uppercase">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedInterview.status === 'Completed' ? "bg-green-100 text-green-800" :
                      selectedInterview.status === 'Cancelled' ? "bg-red-100 text-red-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {selectedInterview.status}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-100 my-2"></div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-bold uppercase">
                      {userType === 'job_poster' ? "Candidate Name" : "Company Name"}
                    </p>
                    <p className="text-sm font-bold text-gray-700">
                      {userType === 'job_poster' ? selectedInterview.applicant_name : selectedInterview.company_name || "Company"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-bold uppercase">Job Title</p>
                    <p className="text-sm font-semibold text-gray-600">
                      {selectedInterview.job_title}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-bold uppercase">Interview Mode</p>
                    <p className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                      {selectedInterview.interview_mode === 'Online' ? <Video className="w-4 h-4 text-blue-600" /> : <MapPin className="w-4 h-4 text-emerald-600" />}
                      {selectedInterview.interview_mode}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-bold uppercase">Interviewer</p>
                    <p className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                      <User className="w-4 h-4 text-gray-400" />
                      {selectedInterview.interviewer || "Not Assigned"}
                    </p>
                  </div>
                </div>

                {selectedInterview.meeting_link && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-bold uppercase">
                      {selectedInterview.interview_mode === 'Online' ? "Meeting Link" : "Venue Location"}
                    </p>
                    {selectedInterview.interview_mode === 'Online' ? (
                      <a
                        href={selectedInterview.meeting_link.startsWith("http") ? selectedInterview.meeting_link : `https://${selectedInterview.meeting_link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 font-semibold underline flex items-center gap-1"
                      >
                        <Video className="w-4 h-4" /> Join Online Meeting
                      </a>
                    ) : (
                      <p className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {selectedInterview.meeting_link}
                      </p>
                    )}
                  </div>
                )}

                {selectedInterview.notes && (
                  <div className="space-y-1 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Important Notes</p>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap">{selectedInterview.notes}</p>
                  </div>
                )}
              </div>

              {/* Modal footer (Actions for posters only) */}
              <div className="bg-gray-50 px-6 py-4 flex justify-between gap-3 border-t border-gray-100">
                {userType === 'job_poster' ? (
                  <>
                    <button
                      onClick={() => handleCancelInterview(selectedInterview.id)}
                      className="text-xs font-bold text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Event
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenEditModal(selectedInterview)}
                        className="bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1"
                      >
                        <Edit className="w-4 h-4" /> Edit Details
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold py-2 rounded-xl transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Schedule Form (Create & Edit) */}
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 max-h-[90vh] flex flex-col">
              
              {/* Modal header */}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
                <h3 className="text-lg font-bold">
                  {isEditing ? "Edit Interview Schedule" : "Schedule New Interview"}
                </h3>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal form */}
              <form onSubmit={handleSaveInterview} className="overflow-y-auto flex-1 p-6 space-y-4">
                
                {/* Candidate Selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Select Candidate / Application *
                  </label>
                  {isEditing ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-semibold text-gray-700">
                      {selectedInterview?.applicant_name} ({selectedInterview?.job_title})
                    </div>
                  ) : (
                    <select
                      value={formCandidateId}
                      onChange={(e) => setFormCandidateId(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Choose a Candidate --</option>
                      {candidates.map(cand => (
                        <option key={cand.id} value={cand.id}>
                          {cand.name} - {cand.position}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Interview Title *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                    placeholder="e.g. Technical Round 1"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                      Time *
                    </label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Mode & Interviewer */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                      Interview Mode
                    </label>
                    <select
                      value={formMode}
                      onChange={(e) => setFormMode(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Online">Online (Video Call)</option>
                      <option value="Offline">Offline (In-Person)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                      Interviewer Name
                    </label>
                    <input
                      type="text"
                      value={formInterviewer}
                      onChange={(e) => setFormInterviewer(e.target.value)}
                      placeholder="e.g. John Doe (Tech Lead)"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Meeting Link / Venue */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    {formMode === 'Online' ? "Meeting URL Link" : "Venue Address Location"}
                  </label>
                  <input
                    type="text"
                    value={formLink}
                    onChange={(e) => setFormLink(e.target.value)}
                    placeholder={formMode === 'Online' ? "https://meet.google.com/xyz..." : "Office 402, Building A, Downtown..."}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Status Selection (only visible during editing) */}
                {isEditing && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                      Status State
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Preparation Instructions / Notes
                  </label>
                  <textarea
                    rows="3"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="e.g. Please bring a copy of your CV and join 5 minutes early."
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex gap-3 pt-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(false)}
                    className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-800 hover:bg-blue-900 text-white font-bold py-2.5 rounded-xl text-sm shadow-md transition-colors"
                  >
                    {isEditing ? "Save Changes" : "Create Interview"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CalendarPage;
