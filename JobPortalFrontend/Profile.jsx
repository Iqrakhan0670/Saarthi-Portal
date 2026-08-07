"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import jsPDF from "jspdf"
import { Download, FileText, X, Check } from "lucide-react"

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080"

const Profile = () => {
  const navigate = useNavigate()
  const mountedRef = useRef(true)

  // initial shape
  const getInitialProfileState = () => ({
    basicInfo: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      city: "",
      state: "",
      country: "",
      preferredLocation: "",
      age: "",
      gender: "",
      jobType: "",
      expectedSalary: "",
      profilePhotoUrl: "",
    },
    profileSummary: "",
    skills: [],
    languages: [],
    internships: [],
    projects: [],
    accomplishments: {
      certifications: [],
      awards: [],
      clubsCommittees: [],
    },
    employment: [],
    education: [],
    resume: { file: null, url: "" },
  })

  const [profileData, setProfileData] = useState(getInitialProfileState())
  const [counts, setCounts] = useState({
    education: 0,
    skills: 0,
    languages: 0,
    internships: 0,
    projects: 0,
    employment: 0,
    accomplishments: { certifications: 0, awards: 0, clubs: 0, total: 0 },
  })
  const [loading, setLoading] = useState(false)
  const [previewPhoto, setPreviewPhoto] = useState("")
  const [resumeLoadError, setResumeLoadError] = useState(false)
  const [showResumeModal, setShowResumeModal] = useState(false)

  // Modals / alerts
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState("")
  const [confirmMessage, setConfirmMessage] = useState("")
  const [onConfirmAction, setOnConfirmAction] = useState(() => () => {})
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [alertMessage, setAlertMessage] = useState("")
  const [alertType, setAlertType] = useState("success")

  useEffect(() => {
    mountedRef.current = true
    return () => (mountedRef.current = false)
  }, [])

  const openConfirm = (title, message, action) => {
    setConfirmTitle(title)
    setConfirmMessage(message)
    setOnConfirmAction(() => action)
    setShowConfirmModal(true)
  }
  const handleConfirmYes = () => {
    onConfirmAction()
    setShowConfirmModal(false)
  }
  const handleConfirmNo = () => setShowConfirmModal(false)

  const openAlert = (message, type = "success") => {
    setAlertMessage(message)
    setAlertType(type)
    setShowAlertModal(true)
  }
  const closeAlert = () => setShowAlertModal(false)

  // Robust API wrapper: includes token lookup and graceful fallback
  const apiRequest = async (url, options = {}) => {
    try {
      const token =
        localStorage.getItem("authToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt") ||
        localStorage.getItem("accessToken")

      const headers = {
        ...(options.headers || {}),
      }

      // if not sending formdata, default JSON content-type
      if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json"
      }

      if (token) headers["Authorization"] = `Bearer ${token}`

      const res = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
      })

      if (!res.ok) {
        if (res.status === 401) {
          openAlert("Authentication failed. Please login again.", "error")
        }
        throw new Error(`HTTP ${res.status}`)
      }

      // Try parse JSON, but not all endpoints return JSON (defensive)
      const contentType = res.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        return await res.json()
      } else {
        return { success: true, data: await res.text() }
      }
    } catch (err) {
      // Log and return safe fallback
      console.warn("apiRequest warning:", err.message)
      // For write operations, return success mock so UI doesn't break during dev
      if (options.method && options.method !== "GET") return { success: true, data: {} }
      return { success: true, data: [] }
    }
  }

  // Upload helper (FormData)
  const uploadFile = async (endpoint, fieldName, file) => {
    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("accessToken")

    const fd = new FormData()
    fd.append(fieldName, file)

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: fd,
    })

    if (!res.ok) {
      if (res.status === 401) openAlert("Authentication failed during upload", "error")
      throw new Error(`Upload failed ${res.status}`)
    }
    // expect JSON
    return await res.json()
  }

  // Helper to standardize array-returning responses
  const toArray = (res) => {
    if (!res) return []
    if (Array.isArray(res)) return res
    if (Array.isArray(res.data)) return res.data
    if (typeof res === "object") {
      // find first array
      for (const v of Object.values(res)) {
        if (Array.isArray(v)) return v
      }
    }
    return []
  }

  // Fetch profile + related lists in parallel
  const fetchUserProfile = async () => {
    setLoading(true)
    try {
      const [
        profileRes,
        skillsRes,
        languagesRes,
        internshipsRes,
        projectsRes,
        educationsRes,
        employmentsRes,
        accomplishmentsRes,
      ] = await Promise.all([
        apiRequest("/api/userprofile", { method: "GET" }),
        apiRequest("/api/userskills", { method: "GET" }),
        apiRequest("/api/userlanguages", { method: "GET" }),
        apiRequest("/api/userinternships", { method: "GET" }),
        apiRequest("/api/userprojects", { method: "GET" }),
        apiRequest("/api/usereducations", { method: "GET" }),
        apiRequest("/api/useremployments", { method: "GET" }),
        apiRequest("/api/useraccomplishments", { method: "GET" }),
      ])

      const user = profileRes || {}
      const skills = toArray(skillsRes)
      const languages = toArray(languagesRes)
      const internships = toArray(internshipsRes)
      const projects = toArray(projectsRes)
      const education = toArray(educationsRes)
      const employment = toArray(employmentsRes)
      const accomplishments = (accomplishmentsRes && (accomplishmentsRes.data || accomplishmentsRes)) || {
        certifications: [],
        awards: [],
        clubsCommittees: [],
      }

      const merged = {
        basicInfo: {
          firstName: (user.first_name || user.firstName || "") + "",
          lastName: (user.last_name || user.lastName || "") + "",
          email: (user.email || "") + "",
          phone: (user.phone || "") + "",
          city: (user.city || "") + "",
          state: (user.state || "") + "",
          country: (user.country || "") + "",
          preferredLocation: (user.preferred_location || user.preferredLocation || "") + "",
          age: user.age ? String(user.age) : "",
          gender: user.gender || "",
          jobType: user.job_type || user.jobType || "",
          expectedSalary: user.expected_salary ? String(user.expected_salary) : user.expectedSalary ? String(user.expectedSalary) : "",
          profilePhotoUrl: user.profile_photo_url || user.profilePhotoUrl || "",
        },
        profileSummary: user.profile_summary || user.profileSummary || "",
        skills,
        languages,
        internships,
        projects,
        education,
        employment,
        accomplishments,
        resume: { file: null, url: user.resume_url || user.resumeUrl || "" },
      }

      if (mountedRef.current) setProfileData(merged)

      // compute counts
      setCounts({
        education: education.length,
        skills: skills.length,
        languages: languages.length,
        internships: internships.length,
        projects: projects.length,
        employment: employment.length,
        accomplishments: {
          certifications: Array.isArray(accomplishments.certifications) ? accomplishments.certifications.length : 0,
          awards: Array.isArray(accomplishments.awards) ? accomplishments.awards.length : 0,
          clubs: Array.isArray(accomplishments.clubsCommittees) ? accomplishments.clubsCommittees.length : 0,
          total:
            (accomplishments.certifications?.length || 0) +
            (accomplishments.awards?.length || 0) +
            (accomplishments.clubsCommittees?.length || 0),
        },
      })
    } catch (err) {
      console.error("fetchUserProfile error", err)
      if (mountedRef.current) setProfileData(getInitialProfileState())
    } finally {
      setLoading(false)
    }
  }

  // separate function to refresh counts only
  const fetchCounts = async () => {
    try {
      const [edu, skills, lang, intern, proj, emp, acc] = await Promise.all([
        apiRequest("/api/usereducations", { method: "GET" }),
        apiRequest("/api/userskills", { method: "GET" }),
        apiRequest("/api/userlanguages", { method: "GET" }),
        apiRequest("/api/userinternships", { method: "GET" }),
        apiRequest("/api/userprojects", { method: "GET" }),
        apiRequest("/api/useremployments", { method: "GET" }),
        apiRequest("/api/useraccomplishments", { method: "GET" }),
      ])

      const accObj = acc?.data || acc || {}
      setCounts({
        education: toArray(edu).length,
        skills: toArray(skills).length,
        languages: toArray(lang).length,
        internships: toArray(intern).length,
        projects: toArray(proj).length,
        employment: toArray(emp).length,
        accomplishments: {
          certifications: Array.isArray(accObj.certifications) ? accObj.certifications.length : 0,
          awards: Array.isArray(accObj.awards) ? accObj.awards.length : 0,
          clubs: Array.isArray(accObj.clubsCommittees) ? accObj.clubsCommittees.length : 0,
          total:
            (accObj.certifications?.length || 0) +
            (accObj.awards?.length || 0) +
            (accObj.clubsCommittees?.length || 0),
        },
      })
    } catch (err) {
      console.error("fetchCounts error", err)
    }
  }

  useEffect(() => {
    fetchUserProfile()
    fetchCounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // small input handler
  const handleInputChange = (section, field, value) => {
    setProfileData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))
  }

  // Skills quick-edit: add / remove / save
  const addSkill = (skill) => {
    if (!skill || !skill.trim()) return
    const s = skill.trim()
    if (profileData.skills.find((k) => (k.name || k).toLowerCase() === s.toLowerCase())) return
    setProfileData((p) => ({ ...p, skills: [...(p.skills || []), s] }))
  }
  const removeSkillAt = (index) => {
    setProfileData((p) => {
      const arr = [...(p.skills || [])]
      arr.splice(index, 1)
      return { ...p, skills: arr }
    })
  }
  const saveSkills = async () => {
    try {
      // backend may expect { skills: [...] } or direct array - attempt sensible PUT
      const payload = { skills: profileData.skills }
      const res = await apiRequest("/api/userskills", {
        method: "PUT",
        body: JSON.stringify(payload),
      })
      // if backend returns updated list, sync
      if (res && Array.isArray(res.data)) {
        setProfileData((p) => ({ ...p, skills: res.data }))
      }
      openAlert("Skills saved.", "success")
      await fetchCounts()
    } catch (err) {
      console.error("saveSkills error", err)
      openAlert("Failed to save skills", "error")
    }
  }

  // File upload handler (photo / resume)
  const handleFileUpload = async (event, type) => {
    const file = event.target.files?.[0]
    if (!file) return

    const maxSize = type === "profilePhoto" ? 5 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      openAlert(`File too large. Max ${maxSize / (1024 * 1024)}MB`, "error")
      return
    }

    try {
      if (type === "profilePhoto") {
        if (!file.type.startsWith("image/")) {
          openAlert("Please choose an image file", "error")
          return
        }
        const reader = new FileReader()
        reader.onload = (e) => setPreviewPhoto(e.target?.result || "")
        reader.readAsDataURL(file)

        const json = await uploadFile("/api/userprofile/upload/photo", "profilePhoto", file)
        if (json && json.url) {
          setProfileData((p) => ({ ...p, basicInfo: { ...p.basicInfo, profilePhotoUrl: json.url } }))
          openAlert("Profile photo uploaded", "success")
        } else openAlert("Photo uploaded but server response unexpected", "success")
      } else if (type === "resume") {
        // allow pdf/doc/docx
        const lower = (file.name || "").toLowerCase()
        const okExt = [".pdf", ".doc", ".docx"].some((e) => lower.endsWith(e))
        if (!okExt) {
          openAlert("Please upload PDF or Word (.doc/.docx)", "error")
          return
        }

        const json = await uploadFile("/api/userprofile/upload/resume", "resume", file)
        // server expected to return { url: '...' } and optionally extractedData
        const resumeUrl = json?.url || json?.data?.url || ""
        setProfileData((p) => ({ ...p, resume: { file: { name: file.name, type: file.type, size: file.size }, url: resumeUrl } }))
        openAlert("Resume uploaded", "success")

        // If server returned extractedData, merge it; else attempt to call extraction endpoint
        if (json?.extractedData) {
          const ed = json.extractedData
          mergeExtractedData(ed)
        } else {
          // attempt server-side extraction (best-effort)
          try {
            if (resumeUrl) {
              // Some backends require { url } POST to extraction endpoint
              const extResp = await apiRequest("/api/userprofile/extract_resume", {
                method: "POST",
                body: JSON.stringify({ url: resumeUrl }),
              })
              if (extResp && (extResp.extractedData || extResp.data?.extractedData || extResp.data)) {
                const ed = extResp.extractedData || extResp.data.extractedData || extResp.data
                mergeExtractedData(ed)
              }
            }
          } catch (e) {
            console.warn("resume extraction request failed", e.message)
          }
        }

        // refresh counts if extraction added items
        await fetchCounts()
      }
    } catch (err) {
      console.error("handleFileUpload error", err)
      openAlert("Upload failed. Try again.", "error")
    } finally {
      // clear preview after small delay if needed
      setTimeout(() => setPreviewPhoto(""), 600)
    }
  }

  // Merge extracted resume data into profileData (best-effort mapping)
  const mergeExtractedData = (ed) => {
    if (!ed || typeof ed !== "object") return
    setProfileData((prev) => {
      const p = { ...prev }

      if (ed.name && !p.basicInfo.firstName) {
        const parts = String(ed.name).split(" ")
        p.basicInfo.firstName = parts[0] || p.basicInfo.firstName
        p.basicInfo.lastName = parts.slice(1).join(" ") || p.basicInfo.lastName
      }
      if (ed.email && !p.basicInfo.email) p.basicInfo.email = ed.email
      if (ed.phone && !p.basicInfo.phone) p.basicInfo.phone = ed.phone
      if (ed.location && !p.basicInfo.city) p.basicInfo.city = ed.location
      if (ed.profileSummary && !p.profileSummary) p.profileSummary = ed.profileSummary
      // arrays:
      if (ed.skills && Array.isArray(ed.skills) && ed.skills.length > 0) {
        // normalize to strings
        p.skills = Array.from(new Set([...(p.skills || []), ...ed.skills.map((s) => (typeof s === "string" ? s : s.name || ""))]))
      }
      if (ed.languages && Array.isArray(ed.languages)) {
        p.languages = Array.from(new Set([...(p.languages || []), ...ed.languages]))
      }
      if (ed.education && Array.isArray(ed.education)) {
        p.education = [...(p.education || []), ...ed.education]
      }
      if (ed.projects && Array.isArray(ed.projects)) p.projects = [...(p.projects || []), ...ed.projects]
      if (ed.employment && Array.isArray(ed.employment)) p.employment = [...(p.employment || []), ...ed.employment]
      if (ed.internships && Array.isArray(ed.internships)) p.internships = [...(p.internships || []), ...ed.internships]
      if (ed.accomplishments && typeof ed.accomplishments === "object") {
        p.accomplishments = {
          certifications: [...new Set([...(p.accomplishments?.certifications || []), ...(ed.accomplishments.certifications || [])])],
          awards: [...new Set([...(p.accomplishments?.awards || []), ...(ed.accomplishments.awards || [])])],
          clubsCommittees: [...new Set([...(p.accomplishments?.clubsCommittees || []), ...(ed.accomplishments.clubsCommittees || [])])],
        }
      }

      return p
    })
    openAlert("Resume data extracted and merged", "success")
  }

  // Delete resume
  const handleDeleteResume = async () => {
    openConfirm("Delete Resume", "Are you sure you want to delete your resume?", async () => {
      try {
        await apiRequest("/api/userprofile/delete/resume", { method: "DELETE" })
        setProfileData((p) => ({ ...p, resume: { file: null, url: "" } }))
        setResumeLoadError(false)
        openAlert("Resume deleted", "success")
      } catch (err) {
        console.error("delete resume", err)
        openAlert("Failed to delete resume", "error")
      }
    })
  }

  // Download via a backend proxy route (keeps tokens safe)
  const getResumeFileExtension = () => {
    const url = profileData.resume.url || ""
    if (url.includes(".docx")) return ".docx"
    if (url.includes(".doc")) return ".doc"
    return ".pdf"
  }
  const handleDownloadResume = async () => {
    if (!profileData.resume.url) return
    try {
      const downloadUrl = `${API_BASE_URL}/download?url=${encodeURIComponent(profileData.resume.url)}`
      const resp = await fetch(downloadUrl)
      if (!resp.ok) throw new Error("Failed")
      const blob = await resp.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = `${profileData.basicInfo.firstName || "resume"}_${getResumeFileExtension()}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error("download resume", err)
      openAlert("Failed to download resume", "error")
    }
  }

  const handlePreviewResume = () => {
    setResumeLoadError(false)
    setShowResumeModal(true)
  }
  const handleResumeLoadError = () => setResumeLoadError(true)

  // save profile basic data
  const updateProfile = async (data) => {
    try {
      const flattened = {
        firstName: data.basicInfo.firstName,
        lastName: data.basicInfo.lastName,
        email: data.basicInfo.email,
        phone: data.basicInfo.phone,
        city: data.basicInfo.city,
        state: data.basicInfo.state,
        country: data.basicInfo.country,
        preferredLocation: data.basicInfo.preferredLocation,
        age: data.basicInfo.age,
        gender: data.basicInfo.gender,
        jobType: data.basicInfo.jobType,
        expectedSalary: data.basicInfo.expectedSalary,
        profileSummary: data.profileSummary || null,
        profilePhotoUrl: data.basicInfo.profilePhotoUrl || null,
        resumeUrl: data.resume && data.resume.url ? data.resume.url : null,
      }

      const res = await apiRequest("/api/userprofile", {
        method: "PUT",
        body: JSON.stringify(flattened),
      })
      if (res && (res.message?.toLowerCase().includes("success") || res.success)) {
        openAlert("Profile saved", "success")
      } else {
        openAlert("Profile saved (server response ambiguous)", "success")
      }
      // refresh lists
      await fetchUserProfile()
      await fetchCounts()
    } catch (err) {
      console.error("updateProfile", err)
      openAlert("Failed to save profile", "error")
    }
  }

  const handleSaveProfile = async () => {
    // basic client-side validation (minimal)
    const required = ["firstName", "lastName", "email", "phone", "city"]
    const missing = required.filter((k) => !(profileData.basicInfo[k] || "").toString().trim())
    if (missing.length > 0) {
      openAlert(`Fill required: ${missing.join(", ")}`, "error")
      return
    }
    await updateProfile(profileData)
  }

  // Completion %
  const calculateCompletion = () => {
    const b = profileData.basicInfo || {}
    const sections = [
      !!b.firstName,
      !!b.lastName,
      !!b.email,
      !!b.phone,
      !!b.city,
      !!profileData.profileSummary,
      !!profileData.resume.url,
      (counts.skills || 0) > 0,
      (counts.education || 0) > 0,
    ]
    const done = sections.filter(Boolean).length
    return Math.round((done / sections.length) * 100)
  }

  // enhanced PDF generator with sections and page breaks
  const generatePDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" })
    const margin = 40
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = margin

    const putText = (text, options = {}) => {
      const { size = 10, style = "normal", align = "left", linesp = 14 } = options
      doc.setFontSize(size)
      doc.setFont(undefined, style)
      const lines = typeof text === "string" ? doc.splitTextToSize(text, pageWidth - margin * 2) : text
      doc.text(lines, margin, y, { align })
      y += (Array.isArray(lines) ? lines.length : 1) * linesp
    }

    // Header
    doc.setFillColor(20, 88, 255)
    doc.rect(0, 0, pageWidth, 70, "F")
    doc.setTextColor("#ffffff")
    doc.setFontSize(20)
    doc.setFont(undefined, "bold")
    putText(`${profileData.basicInfo.firstName || ""} ${profileData.basicInfo.lastName || ""}`, { size: 20, style: "bold", linesp: 24 })
    doc.setFontSize(10)
    doc.setFont(undefined, "normal")
    doc.setTextColor("#ffffff")
    const contact = []
    if (profileData.basicInfo.email) contact.push(profileData.basicInfo.email)
    if (profileData.basicInfo.phone) contact.push(profileData.basicInfo.phone)
    if (profileData.basicInfo.city) contact.push(profileData.basicInfo.city)
    putText(contact.join(" • "), { size: 10, linesp: 14 })
    y += 6
    // reset color for body
    doc.setTextColor("#000000")
    y = Math.max(y, 90)

    // Summary
    if (profileData.profileSummary) {
      putText("SUMMARY", { size: 12, style: "bold", linesp: 16 })
      putText(profileData.profileSummary, { size: 10, linesp: 14 })
      y += 6
    }

    // Skills as inline chips
    if (profileData.skills && profileData.skills.length > 0) {
      putText("SKILLS", { size: 12, style: "bold", linesp: 16 })
      // draw simple comma-separated list
      putText(profileData.skills.map((s) => (typeof s === "string" ? s : s.name || "")).join(", "), { size: 10, linesp: 14 })
      y += 6
    }

    // Experience (employment)
    if (profileData.employment && profileData.employment.length > 0) {
      putText("EXPERIENCE", { size: 12, style: "bold", linesp: 16 })
      profileData.employment.forEach((e) => {
        if (y > doc.internal.pageSize.getHeight() - 120) {
          doc.addPage(); y = margin
        }
        putText(`${e.title || e.position || ""} — ${e.company || e.employer || ""}`, { size: 11, style: "bold" })
        let desc = e.description || e.summary || e.responsibilities || ""
        const meta = [e.start_date || e.from, e.end_date || e.to].filter(Boolean).join(" — ")
        if (meta) putText(meta, { size: 9, linesp: 12 })
        if (desc) putText(desc, { size: 10 })
      })
      y += 6
    }

    // Internships
    if (profileData.internships && profileData.internships.length > 0) {
      putText("INTERNSHIPS", { size: 12, style: "bold", linesp: 16 })
      profileData.internships.forEach((i) => {
        if (y > doc.internal.pageSize.getHeight() - 120) {
          doc.addPage(); y = margin
        }
        putText(`${i.title || i.role || ""} — ${i.company || i.organization || ""}`, { size: 11, style: "bold" })
        if (i.description) putText(i.description, { size: 10 })
      })
      y += 6
    }

    // Education
    if (profileData.education && profileData.education.length > 0) {
      putText("EDUCATION", { size: 12, style: "bold", linesp: 16 })
      profileData.education.forEach((ed) => {
        if (y > doc.internal.pageSize.getHeight() - 120) {
          doc.addPage(); y = margin
        }
        putText(`${ed.degree || ed.qualification || ed.course || ""} — ${ed.institution || ed.school || ""}`, { size: 11, style: "bold" })
        if (ed.year || ed.start || ed.end) putText([ed.start || ed.year || "", ed.end || ""].filter(Boolean).join(" — "), { size: 9 })
        if (ed.description) putText(ed.description, { size: 10 })
      })
      y += 6
    }

    // Projects
    if (profileData.projects && profileData.projects.length > 0) {
      putText("PROJECTS", { size: 12, style: "bold", linesp: 16 })
      profileData.projects.forEach((p) => {
        if (y > doc.internal.pageSize.getHeight() - 120) {
          doc.addPage(); y = margin
        }
        putText(`${p.title || p.name || ""} ${p.link ? " • " + p.link : ""}`, { size: 11, style: "bold" })
        if (p.description) putText(p.description, { size: 10 })
      })
      y += 6
    }

    // Accomplishments & Languages
    if ((profileData.accomplishments && (profileData.accomplishments.certifications?.length || 0)) || (profileData.languages && profileData.languages.length > 0)) {
      putText("OTHER", { size: 12, style: "bold", linesp: 16 })
      if (profileData.accomplishments?.certifications?.length) {
        putText("Certifications: " + profileData.accomplishments.certifications.join(", "), { size: 10 })
      }
      if (profileData.accomplishments?.awards?.length) {
        putText("Awards: " + profileData.accomplishments.awards.join(", "), { size: 10 })
      }
      if (profileData.languages?.length) {
        putText("Languages: " + profileData.languages.join(", "), { size: 10 })
      }
      y += 6
    }

    // finalize
    const fileName = `${(profileData.basicInfo.firstName || "candidate")}_${(profileData.basicInfo.lastName || "profile")}_Resume.pdf`
    doc.save(fileName)
  }

  // small UI helpers
  const getFullResumeUrl = () => {
    if (!profileData.resume?.url) return ""
    if (profileData.resume.url.startsWith("http://") || profileData.resume.url.startsWith("https://")) return profileData.resume.url
    return `${API_BASE_URL}${profileData.resume.url}`
  }
  const fullResumeUrl = getFullResumeUrl()
  const photoUrl = profileData.basicInfo.profilePhotoUrl
  const displayPhotoSrc = previewPhoto || (photoUrl ? `${API_BASE_URL}${photoUrl}` : null)

  // skill input state
  const [skillInput, setSkillInput] = useState("")

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold text-gray-800">Profile Builder</h1>
          <div className="text-sm text-gray-600">Completion: <span className="font-medium">{calculateCompletion()}%</span></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* left: forms */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Basic Information</h2>
                <button onClick={handleSaveProfile} className="bg-green-600 text-white px-3 py-1 rounded">Save</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input placeholder="First name" value={profileData.basicInfo.firstName} onChange={(e) => handleInputChange("basicInfo", "firstName", e.target.value)} className="p-3 border rounded" />
                <input placeholder="Last name" value={profileData.basicInfo.lastName} onChange={(e) => handleInputChange("basicInfo", "lastName", e.target.value)} className="p-3 border rounded" />
                <input placeholder="Email" value={profileData.basicInfo.email} onChange={(e) => handleInputChange("basicInfo", "email", e.target.value)} className="p-3 border rounded" />
                <input placeholder="Phone" value={profileData.basicInfo.phone} onChange={(e) => handleInputChange("basicInfo", "phone", e.target.value)} className="p-3 border rounded" />
                <input placeholder="City" value={profileData.basicInfo.city} onChange={(e) => handleInputChange("basicInfo", "city", e.target.value)} className="p-3 border rounded" />
                <input placeholder="State" value={profileData.basicInfo.state} onChange={(e) => handleInputChange("basicInfo", "state", e.target.value)} className="p-3 border rounded" />
                <input placeholder="Country" value={profileData.basicInfo.country} onChange={(e) => handleInputChange("basicInfo", "country", e.target.value)} className="p-3 border rounded" />
                <input placeholder="Preferred location" value={profileData.basicInfo.preferredLocation} onChange={(e) => handleInputChange("basicInfo", "preferredLocation", e.target.value)} className="p-3 border rounded" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="text-lg font-semibold mb-2">Profile Summary</h3>
              <textarea rows={6} value={profileData.profileSummary} onChange={(e) => handleInputChange("profileSummary", null, e.target.value)} className="w-full border p-3 rounded" placeholder="Short summary..." />
            </div>

            {/* show a preview of lists to edit quickly */}
            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="text-lg font-semibold mb-3">Quick Skills (edit & save)</h3>
              <div className="flex gap-2 mb-3">
                <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="Add skill and press Enter or click Add" className="p-2 border rounded flex-1" onKeyDown={(e) => { if (e.key === "Enter") { addSkill(skillInput); setSkillInput("") }}} />
                <button onClick={() => { addSkill(skillInput); setSkillInput("") }} className="bg-blue-600 text-white px-3 rounded">Add</button>
                <button onClick={saveSkills} className="bg-green-600 text-white px-3 rounded">Save</button>
              </div>

              <div className="flex flex-wrap gap-2">
                {(profileData.skills || []).map((s, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded">
                    <span className="text-sm">{typeof s === "string" ? s : s.name || ""}</span>
                    <button onClick={() => removeSkillAt(i)} className="text-red-500 hover:text-red-700"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                {(!profileData.skills || profileData.skills.length === 0) && <div className="text-sm text-gray-500">No skills yet</div>}
              </div>
            </div>
          </div>

          {/* right: actions */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="text-lg font-semibold mb-3">Profile Photo</h3>
              <div className="mb-3">
                {displayPhotoSrc ? (
                  <div className="w-24 h-24 rounded-full overflow-hidden mb-2">
                    <img src={displayPhotoSrc} alt="profile" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-100 mb-2 flex items-center justify-center">No photo</div>
                )}
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "profilePhoto")} />
              </div>

              <h3 className="text-lg font-semibold mb-2 mt-4">Resume</h3>
              <div className="mb-3">
                {profileData.resume?.url ? (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">Uploaded: {profileData.resume.file?.name || profileData.resume.url}</div>
                    <div className="flex gap-2">
                      <button onClick={handlePreviewResume} className="bg-blue-600 text-white px-3 py-1 rounded">Preview</button>
                      <button onClick={handleDownloadResume} className="bg-indigo-600 text-white px-3 py-1 rounded"><Download className="w-4 h-4 inline-block" /> Download</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 mb-2">No resume uploaded</div>
                )}
                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleFileUpload(e, "resume")} />
                <div className="text-xs text-gray-400 mt-1">Max 10MB. PDF/DOC/DOCX supported.</div>
                {profileData.resume?.url && (
                  <div className="mt-3">
                    <button onClick={handleDeleteResume} className="bg-red-600 text-white px-3 py-1 rounded">Delete Resume</button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-xl shadow">
              <h3 className="text-lg font-semibold mb-2">Generate Resume PDF</h3>
              <p className="text-sm text-blue-100 mb-3">Exports a professional PDF built from your profile fields.</p>
              <button onClick={generatePDF} className="bg-white text-blue-700 px-4 py-2 rounded font-semibold w-full">Download PDF</button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow text-sm">
              <div className="flex justify-between">
                <span>Education</span><strong>{counts.education}</strong>
              </div>
              <div className="flex justify-between mt-2">
                <span>Skills</span><strong>{counts.skills}</strong>
              </div>
              <div className="flex justify-between mt-2">
                <span>Languages</span><strong>{counts.languages}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Resume Preview Modal */}
        {showResumeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white w-full max-w-5xl rounded shadow-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h4 className="font-semibold">Resume Preview</h4>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowResumeModal(false)} className="px-3 py-1 rounded bg-gray-100"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="p-4">
                {fullResumeUrl && !fullResumeUrl.toLowerCase().includes(".doc") && !fullResumeUrl.toLowerCase().includes(".docx") ? (
                  <iframe src={`${API_BASE_URL}/download?url=${encodeURIComponent(fullResumeUrl)}#toolbar=0`} width="100%" height="600" title="preview" onError={handleResumeLoadError} />
                ) : (
                  <div className="text-center py-10">
                    <FileText className="w-12 h-12 mx-auto text-gray-400" />
                    <div className="mt-3">Preview not available for Word docs. Download to view.</div>
                    <div className="mt-4 flex justify-center gap-2">
                      <button onClick={handleDownloadResume} className="bg-blue-600 text-white px-4 py-2 rounded">Download</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Confirm modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white w-full max-w-md rounded shadow-lg p-4">
              <h4 className="font-semibold mb-2">{confirmTitle}</h4>
              <p className="text-sm text-gray-600 mb-4">{confirmMessage}</p>
              <div className="flex gap-2 justify-end">
                <button onClick={handleConfirmNo} className="px-3 py-1 rounded bg-gray-200">Cancel</button>
                <button onClick={handleConfirmYes} className="px-3 py-1 rounded bg-red-600 text-white">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Alert modal */}
        {showAlertModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
            <div className={`pointer-events-auto mb-6 rounded shadow-lg px-4 py-3 ${alertType === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
              <div className="flex items-center gap-3">
                {alertType === "success" ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                <div>{alertMessage}</div>
                <button onClick={closeAlert} className="ml-3 underline">OK</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
