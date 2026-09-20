"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Video, FileImage, ShieldCheck, AlertCircle, CheckCircle2, ArrowRight, RefreshCw, Upload, LogOut, Shield } from "lucide-react";
import { api, apiFetch, getCurrentUser, setCurrentUser, getTokens } from "../../utils/api";
import AuthLayout from "../../components/AuthLayout";
import { toastSuccess, toastError, toastWarning, toastLoading, toastUpdate } from "../../utils/toast-message/taost-message";
import {
  type CloudinaryAssetType,
  dataUrlToBlob,
  getMediaExtension,
  isCloudinaryUrl,
  isSupportedKycVideo,
  optimizeImage,
  uploadAsset,
} from "../../utils/cloudinaryUpload";
import type { Agent } from "@/types";

const GOVERNMENT_ID_TYPES = ["Passport", "National Id", "Driving License", "Voter Id", "Aadhar", "PAN", "Other"];

export default function KycVerificationPage() {
  const router = useRouter();
  const [user, setUser] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [liveSelfie, setLiveSelfie] = useState<string | null>(null);

  // Video state
  const [selfDeclarationVideo, setSelfDeclarationVideo] = useState<string | null>(null);
  // Keep a newly recorded/uploaded file as its original binary. The client
  // portal uploads this raw Blob; base64 round-tripping a video can make a
  // valid recording fail Cloudinary's format inspection.
  const [selfDeclarationVideoFile, setSelfDeclarationVideoFile] = useState<Blob | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isRecordingCameraActive, setIsRecordingCameraActive] = useState(false);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoRecordingStream, setVideoRecordingStream] = useState<MediaStream | null>(null);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(10);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTimer, setRecordingTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  // Govt ID states
  const [govtIdFront, setGovtIdFront] = useState<string | null>(null);
  const [govtIdBack, setGovtIdBack] = useState<string | null>(null);
  const [governmentIdType, setGovernmentIdType] = useState("");
  const [governmentIdNumber, setGovernmentIdNumber] = useState("");
  const [idConfirmed, setIdConfirmed] = useState(false);

  // Status & UI states
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStage, setUploadStage] = useState<"idle" | "uploading" | "finalizing">("idle");
  const [uploadProgress, setUploadProgress] = useState({ selfie: 0, idFront: 0, idBack: 0, video: 0 });
  const [showPopup, setShowPopup] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const videoRecordRef = useRef<HTMLVideoElement | null>(null);
  const videoRecordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch current user and tokens
  const fetchUserData = async () => {
    const { accessToken } = getTokens();
    if (!accessToken) {
      router.push("/login?message=session_expired");
      return;
    }

    let currentUser = getCurrentUser();
    if (!currentUser) {
      try {
        const res = await apiFetch<{ data?: Agent; agent?: Agent }>("/agent/profile");
        if (res && res.status) {
          currentUser = res.data || res.agent || null;
          if (currentUser) {
            setCurrentUser(currentUser);
          }
        }
      } catch (err) {
        console.error("Error fetching agent profile on reload:", err);
      }
    }

    if (currentUser) {
      setUser(currentUser);
      if (currentUser.kycStatus === "approved") {
        router.push("/dashboard");
        return;
      }

      // Load saved photos from DB if present
      if (currentUser.kycVerification) {
        setLiveSelfie(currentUser.kycVerification.liveSelfie || null);
        setSelfDeclarationVideo(currentUser.kycVerification.selfDeclarationVideo || null);
        setVideoPreviewUrl(currentUser.kycVerification.selfDeclarationVideo || null);
        setGovtIdFront(currentUser.kycVerification.governmentIdFront || null);
        setGovtIdBack(currentUser.kycVerification.governmentIdBack || null);
        setGovernmentIdType(currentUser.kycVerification.governmentIdType || "");
        setGovernmentIdNumber(currentUser.kycVerification.governmentIdNumber || "");
        setIdConfirmed(Boolean(currentUser.kycVerification.governmentIdType && currentUser.kycVerification.governmentIdNumber));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUserData();
  }, [router]);

  // Clean up camera streams only on unmount
  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (videoRecordingStreamRef.current) {
        videoRecordingStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);



  // Connect streams safely using callback refs to avoid mount timing race conditions
  const setSelfieVideoRef = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && cameraStream) {
      el.srcObject = cameraStream;
    }
  };

  const setRecordVideoRef = (el: HTMLVideoElement | null) => {
    videoRecordRef.current = el;
    if (el && videoRecordingStream) {
      el.srcObject = videoRecordingStream;
    }
  };

  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: "user" }
      });
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setIsCameraActive(true);
    } catch (err) {
      console.warn("Could not start camera with user facing mode/resolution, trying basic constraints:", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraStreamRef.current = stream;
        setCameraStream(stream);
        setIsCameraActive(true);
      } catch (fallbackErr) {
        console.error("Camera access error:", fallbackErr);
        setError("Unable to access live camera. Please check your camera permissions.");
        toastError("Camera Error", { description: "Unable to access live camera. Please check your camera permissions." });
      }
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setCameraStream(null);
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      // Set canvas size matching the video aspect ratio
      canvas.width = video.videoWidth || 480;
      canvas.height = video.videoHeight || 360;

      // Mirror the image for user selfie natural preview
      context.translate(canvas.width, 0);
      context.scale(-1, 1);

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Reset translation/scale
      context.setTransform(1, 0, 0, 1, 0, 0);

      const dataUrl = canvas.toDataURL("image/jpeg");
      setLiveSelfie(dataUrl);
      stopCamera();
    }
  };

  // Live video declaration helpers
  const startVideoCamera = async () => {
    setError("");
    try {
      // Try video + audio first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: "user" },
        audio: true
      });
      videoRecordingStreamRef.current = stream;
      setVideoRecordingStream(stream);
      setIsRecordingCameraActive(true);
    } catch (err) {
      console.warn("Could not start camera with audio, trying video only:", err);
      try {
        // Fallback to video only
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: "user" }
        });
        videoRecordingStreamRef.current = stream;
        setVideoRecordingStream(stream);
        setIsRecordingCameraActive(true);
        setError("Note: Microphone could not be accessed. Recording video only.");
        toastWarning("Microphone Muted", { description: "Microphone could not be accessed. Recording video only." });
      } catch (fallbackErr) {
        console.error("Camera access error:", fallbackErr);
        setError("Unable to access camera. Please check your camera permissions.");
        toastError("Camera Error", { description: "Unable to access camera. Please check your camera permissions." });
      }
    }
  };

  const stopVideoCamera = () => {
    if (videoRecordingStreamRef.current) {
      videoRecordingStreamRef.current.getTracks().forEach((track) => track.stop());
      videoRecordingStreamRef.current = null;
    }
    setVideoRecordingStream(null);
    setIsRecordingCameraActive(false);
    setIsVideoRecording(false);
  };

  const startRecording = () => {
    if (!videoRecordingStream) return;

    if (typeof MediaRecorder === "undefined") {
      setError("Web recording is not supported in this browser. Please upload a video file instead.");
      toastError("Unsupported Browser", { description: "Web recording is not supported. Please upload a video file instead." });
      return;
    }

    // Use the first format that the current browser can actually produce.
    // The upload below preserves this exact Blob, matching the client KYC flow.
    const supportedRecordingType = typeof MediaRecorder.isTypeSupported === "function"
      ? [
          "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
          "video/mp4;codecs=avc1.42E01E",
          "video/mp4",
          "video/webm;codecs=vp8,opus",
          "video/webm",
        ].find((type) => MediaRecorder.isTypeSupported(type))
      : undefined;

    if (!supportedRecordingType) {
      setError("This browser cannot record a compatible video. Please upload an MP4, MOV, or WebM file.");
      toastError("Video Recording Unavailable", {
        description: "Use Upload Video and choose an MP4, MOV, or WebM declaration video.",
      });
      return;
    }

    const options: MediaRecorderOptions = {
      mimeType: supportedRecordingType,
      videoBitsPerSecond: 900_000,
      audioBitsPerSecond: 64_000,
    };

    try {
      const recorder = new MediaRecorder(videoRecordingStream, options);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        console.log("ondataavailable:", e.data ? `size=${e.data.size} type=${e.data.type}` : "no data");
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        console.log("recorder.onstop called. total chunks:", chunks.length);
        const recordedType = recorder.mimeType || options.mimeType || "video/webm";
        console.log("Using MIME type:", recordedType);
        const blob = new Blob(chunks, { type: recordedType });
        console.log("Created Blob: size=", blob.size, "type=", blob.type);

        // Revoke the old preview URL manually if it was a blob URL to prevent memory leaks
        setVideoPreviewUrl((prev) => {
          if (prev && prev.startsWith("blob:")) {
            console.log("Revoking previous preview blob URL:", prev);
            URL.revokeObjectURL(prev);
          }
          const newUrl = URL.createObjectURL(blob);
          console.log("Created new preview blob URL:", newUrl);
          return newUrl;
        });

        setSelfDeclarationVideo(null);
        setSelfDeclarationVideoFile(blob);
        stopVideoCamera();
      };

      recorder.start(); // Start recording without timeslice to avoid chunk fragmentation issues
      setMediaRecorder(recorder);
      setIsVideoRecording(true);
      setRecordingTimeLeft(10);

      const interval = setInterval(() => {
        setRecordingTimeLeft((prev) => {
          if (prev <= 1) {
            if (recordingTimerRef.current) {
              clearInterval(recordingTimerRef.current);
              recordingTimerRef.current = null;
            }
            setRecordingTimer(null);
            if (recorder.state !== "inactive") {
              recorder.stop();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      recordingTimerRef.current = interval;
      setRecordingTimer(interval);
    } catch (e) {
      console.error("Error starting MediaRecorder:", e);
      setError("Failed to start recording. Please try again.");
      toastError("Recording Error", { description: "Failed to start recording. Please try again." });
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingTimer(null);
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!isSupportedKycVideo(file.type)) {
        setError("Please upload an MP4, MOV, or WebM video file.");
        toastError("Unsupported Video", { description: "For KYC, use an MP4, MOV, or WebM video file." });
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setError("Video file size should not exceed 25MB.");
        toastError("File Too Large", { description: "Video file size should not exceed 25MB." });
        return;
      }

      // Generate preview URL for local video upload
      setVideoPreviewUrl((prev) => {
        if (prev && prev.startsWith("blob:")) {
          URL.revokeObjectURL(prev);
        }
        return URL.createObjectURL(file);
      });

      setSelfDeclarationVideo(null);
      setSelfDeclarationVideoFile(file);
      toastSuccess("Video ready to upload!");
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setPhotoState: React.Dispatch<React.SetStateAction<string | null>>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please upload image files only (PNG/JPG).");
        toastError("Invalid File Type", { description: "Please upload image files only (PNG/JPG)." });
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError("File size should not exceed 10MB.");
        toastError("File Too Large", { description: "File size should not exceed 10MB." });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setPhotoState(typeof reader.result === "string" ? reader.result : null);
        toastSuccess("Image uploaded successfully!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAndSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    if (!liveSelfie) {
      setError("Please capture your live camera photo.");
      toastError("Missing Document", { description: "Please capture your live camera photo." });
      setIsSubmitting(false);
      return;
    }
    if (!selfDeclarationVideo && !selfDeclarationVideoFile) {
      setError("Please record or upload your self-declaration video.");
      toastError("Missing Document", { description: "Please record or upload your self-declaration video." });
      setIsSubmitting(false);
      return;
    }
    if (!governmentIdType || !governmentIdNumber.trim() || !idConfirmed) {
      setError("Please select your Government ID type and confirm its number.");
      toastError("Government ID Required", { description: "Enter and confirm your Government ID details." });
      setIsSubmitting(false);
      return;
    }
    if (!govtIdFront) {
      setError("Please upload the front side of your Government ID.");
      toastError("Missing Document", { description: "Please upload the front side of your Government ID." });
      setIsSubmitting(false);
      return;
    }
    if (!govtIdBack) {
      setError("Please upload the back side of your Government ID.");
      toastError("Missing Document", { description: "Please upload the back side of your Government ID." });
      setIsSubmitting(false);
      return;
    }

    const toastId = toastLoading("Submitting KYC documents...", {
      description: "Uploading photos and videos, please wait."
    });

    try {
      setUploadStage("uploading");
      setUploadProgress({ selfie: 0, idFront: 0, idBack: 0, video: 0 });
      // Upload each asset straight to Cloudinary (agents/<name-slug>/kyc/…) via a
      // signed request, unless it's already a stored URL (reloaded from the DB).
      const putAsset = async (
        value: string,
        assetType: CloudinaryAssetType,
        kind: "image" | "video",
        progressKey: "selfie" | "idFront" | "idBack" | "video",
      ): Promise<string> => {
        if (isCloudinaryUrl(value)) {
          setUploadProgress((current) => ({ ...current, [progressKey]: 100 }));
          return value;
        }
        const raw = dataUrlToBlob(value);
        const { blob, filename } =
          kind === "image"
            ? await optimizeImage(new File([raw], `${assetType}.jpg`, { type: raw.type }))
            : {
                blob: raw,
                filename: `${assetType}.${getMediaExtension(raw.type)}`,
              };
        return uploadAsset(assetType, blob, filename, (percentage) => {
          setUploadProgress((current) => ({ ...current, [progressKey]: percentage }));
        });
      };

      const putVideoAsset = async (): Promise<string> => {
        if (selfDeclarationVideo && isCloudinaryUrl(selfDeclarationVideo)) {
          setUploadProgress((current) => ({ ...current, video: 100 }));
          return selfDeclarationVideo;
        }

        // New agent recordings and selected files are uploaded byte-for-byte,
        // exactly as the client KYC portal does. The data-URL fallback only
        // supports an old in-memory draft from before this change.
        const raw = selfDeclarationVideoFile
          ?? (selfDeclarationVideo ? dataUrlToBlob(selfDeclarationVideo) : null);
        if (!raw || !isSupportedKycVideo(raw.type)) {
          throw new Error("This declaration video is not MP4, MOV, or WebM. Please record it again or choose a supported file.");
        }
        return uploadAsset(
          "declaration_video",
          raw,
          `declaration_video.${getMediaExtension(raw.type)}`,
          (percentage) => setUploadProgress((current) => ({ ...current, video: percentage })),
        );
      };

      // Upload one asset at a time. This is gentler on mobile/weak connections and
      // lets an already-finished asset be kept if a later upload must be retried.
      const selfieUrl = await putAsset(liveSelfie, "selfie", "image", "selfie");
      setLiveSelfie(selfieUrl);

      const idFrontUrl = await putAsset(govtIdFront, "id_front", "image", "idFront");
      setGovtIdFront(idFrontUrl);

      const idBackUrl = await putAsset(govtIdBack, "id_back", "image", "idBack");
      setGovtIdBack(idBackUrl);

      const videoUrl = await putVideoAsset();
      setSelfDeclarationVideo(videoUrl);
      setSelfDeclarationVideoFile(null);
      setVideoPreviewUrl(videoUrl);

      setUploadStage("finalizing");
      const res = await api.submitKyc({
        liveSelfie: selfieUrl,
        selfDeclarationVideo: videoUrl,
        governmentIdFront: idFrontUrl,
        governmentIdBack: idBackUrl,
        governmentIdType,
        governmentIdNumber: governmentIdNumber.trim(),
      });

      if (res.status) {
        toastUpdate(toastId, "success", "KYC Submitted!", {
          description: "Your verification request has been successfully sent to compliance officers."
        });
        setShowPopup(true);
        // Refresh local storage and user states
        fetchUserData();
      } else {
        const errorMsg = res.message || "Failed to submit KYC. Please try again.";
        setError(errorMsg);
        toastUpdate(toastId, "error", "Submission failed", {
          description: errorMsg
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error
        ? err.message
        : "An error occurred during submission. Please try again.";
      setError(errorMsg);
      toastUpdate(toastId, "error", "Submission error", {
        description: errorMsg
      });
    } finally {
      setIsSubmitting(false);
      setUploadStage("idle");
    }
  };

  const overallUploadProgress = Math.round(
    (uploadProgress.selfie + uploadProgress.idFront + uploadProgress.idBack + uploadProgress.video) / 4,
  );

  const completedSteps = [
    Boolean(liveSelfie),
    Boolean(governmentIdType && governmentIdNumber.trim() && idConfirmed),
    Boolean(govtIdFront),
    Boolean(govtIdBack),
    Boolean(selfDeclarationVideo || selfDeclarationVideoFile),
  ];
  const completedStepCount = completedSteps.filter(Boolean).length;
  const currentStep = completedSteps.findIndex((complete) => !complete) + 1 || 5;

  const handleLogout = async () => {
    await api.logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent"></div>
          <span className="text-sm font-medium text-navy/80">Checking KYC Status...</span>
        </div>
      </div>
    );
  }

  const fullName = user?.fullName || `${user?.firstName || "Agent"} ${user?.lastName || ""}`.trim();
  const kycStatus = user?.kycStatus || "pending";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-navy">
      {/* Top Banner/Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white border border-slate-200/80 px-2.5 py-1 rounded-lg flex items-center justify-center">
              <img
                src="/assets/MAH.jpeg"
                alt="Merlion Asset Holdings"
                className="h-12 w-auto object-contain"
              />
            </div>
            <div className="border-l border-slate-200 pl-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-navy/75">Identity Verification</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-navy/80 font-semibold hidden md:inline">Logged in as: {fullName}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-navy/5 hover:bg-red-50 hover:text-red-600 rounded-xl text-xs font-semibold transition duration-150 border border-transparent hover:border-red-100 cursor-pointer"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-center">

        {/* Verification Status Banner */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl border ${kycStatus === "under_review"
              ? "bg-amber-50 border-amber-200 text-amber-600"
              : kycStatus === "rejected"
                ? "bg-red-50 border-red-200 text-red-600"
                : "bg-blue-50 border-blue-200 text-blue-600"
              }`}>
              <Shield size={24} className={kycStatus === "under_review" ? "animate-pulse" : ""} />
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-navy/40 tracking-wider">KYC Status</span>
              <h2 className="text-lg font-bold capitalize mt-0.5">
                {kycStatus === "under_review" ? "Under Review" : kycStatus === "rejected" ? "Rejected" : "Verification Required"}
              </h2>
            </div>
          </div>

        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2 mb-6">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2 mb-6">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* KYC Form / Viewer Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-lg overflow-hidden">

          {/* Header Info */}
          <div className="bg-navy p-8 text-white relative">
            <div className="absolute top-0 right-0 p-8 text-white/5 pointer-events-none">
              <ShieldCheck size={120} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-200 bg-amber-500/20 border border-amber-400/25 px-2.5 py-0.5 rounded-full inline-block mb-3">
              Mandatory Checklist
            </span>
            <h1 className="text-2xl font-heading font-bold">Secure Partner KYC Onboarding</h1>
            <p className="text-xs text-white/70 font-light mt-1.5 max-w-xl leading-relaxed">
              Global regulations require verifying your identity before enabling client integration and commission withdrawals on your portal.
            </p>
          </div>

          <form onSubmit={handleSaveAndSend} className="flex flex-col gap-8 p-8">

            {/* Client-portal style five-step checklist */}
            <div className="order-1 rounded-2xl border border-[#dce7f5] bg-[#f8fafd] p-4 sm:p-5">
              <div className="grid grid-cols-5 gap-1">
                {[
                  "Live Selfie",
                  "Government ID",
                  "ID Front",
                  "ID Back",
                  "Declaration Video",
                ].map((label, index) => {
                  const step = index + 1;
                  const complete = completedSteps[index];
                  const active = !complete && step === currentStep;
                  return (
                    <div key={label} className="relative flex min-w-0 flex-col items-center text-center">
                      {index > 0 && (
                        <span className={`absolute right-1/2 top-4 h-0.5 w-full ${complete ? "bg-[#2563eb]" : "bg-[#dce7f5]"}`} />
                      )}
                      <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-bold ${complete ? "border-[#2563eb] bg-[#2563eb] text-white" : active ? "border-[#2563eb] bg-white text-[#2563eb]" : "border-[#dce7f5] bg-white text-[#8da3c4]"}`}>
                        {complete ? <CheckCircle2 size={14} /> : step}
                      </span>
                      <span className={`mt-2 hidden text-[9px] font-bold leading-tight sm:block ${complete || active ? "text-[#071F55]" : "text-[#8da3c4]"}`}>{label}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-center text-[11px] font-medium text-[#8da3c4]">
                {completedStepCount} of 5 verification steps completed
              </p>
            </div>

            {/* Phase 1: Live Webcam Self Capture */}
            <div className="order-2 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-navy/90 flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-navy/5 flex items-center justify-center text-[10px] text-navy font-bold">1</span>
                Live Selfie Image Capture
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">

                {/* Photo Display / Camera Window */}
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden aspect-video flex flex-col items-center justify-center relative shadow-inner">
                  {isCameraActive ? (
                    <video
                      ref={setSelfieVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : liveSelfie ? (
                    <img
                      src={liveSelfie}
                      alt="Captured Selfie"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-6 space-y-2 text-slate-400">
                      <Camera size={36} className="mx-auto text-slate-300" />
                      <p className="text-xs">No camera photo captured yet.</p>
                    </div>
                  )}

                  {/* Hidden Canvas helper for snapshot */}
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Camera Actions */}
                <div className="space-y-3">
                  <p className="text-xs text-navy/80 font-normal leading-relaxed">
                    Position your face directly in front of your device's webcam. Ensure the lighting is bright and your face is fully visible with no caps or dark glasses.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {isCameraActive ? (
                      <button
                        type="button"
                        onClick={capturePhoto}
                        id="capture-photo-btn"
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-navy text-white hover:bg-navy-light rounded-xl text-xs font-semibold transition"
                      >
                        <Camera size={14} />
                        <span>Capture Snap</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startCamera}
                        disabled={kycStatus === "under_review"}
                        id="start-camera-btn"
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-navy text-white hover:bg-navy-light rounded-xl text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                      >
                        <Camera size={14} />
                        <span>{liveSelfie ? "Retake Live Photo" : "Start Live Camera"}</span>
                      </button>
                    )}

                    {isCameraActive && (
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>


            {/* Phase 2: Government ID number */}
            <div className="order-3 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-navy/90 flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-navy/5 flex items-center justify-center text-[10px] text-navy font-bold">2</span>
                Government ID Number
              </h3>
              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[#dce7f5] bg-[#f8fafd] p-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] md:items-end">
                <label className="block text-xs font-semibold text-[#405981]">
                  ID Type
                  <select
                    value={governmentIdType}
                    onChange={(event) => { setGovernmentIdType(event.target.value); setIdConfirmed(false); }}
                    disabled={kycStatus === "under_review"}
                    className="mt-2 h-11 w-full rounded-xl border border-[#dce7f5] bg-white px-3 text-sm font-medium text-[#071F55] outline-none transition focus:border-[#2563eb]"
                  >
                    <option value="">Select ID type</option>
                    {GOVERNMENT_ID_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-[#405981]">
                  ID Number
                  <input
                    value={governmentIdNumber}
                    onChange={(event) => { setGovernmentIdNumber(event.target.value); setIdConfirmed(false); }}
                    disabled={kycStatus === "under_review"}
                    placeholder="Enter number exactly as shown on your ID"
                    className="mt-2 h-11 w-full rounded-xl border border-[#dce7f5] bg-white px-3 text-sm font-medium text-[#071F55] outline-none placeholder:text-slate-400 transition focus:border-[#2563eb]"
                  />
                </label>
                <button
                  type="button"
                  disabled={!governmentIdType || !governmentIdNumber.trim() || kycStatus === "under_review"}
                  onClick={() => setIdConfirmed(true)}
                  className={`h-11 rounded-xl px-4 text-xs font-bold transition ${idConfirmed ? "bg-emerald-50 text-emerald-700" : "bg-[#1D4ED8] text-white hover:bg-[#1a44c2] disabled:cursor-not-allowed disabled:opacity-50"}`}
                >
                  {idConfirmed ? "ID details saved" : "Confirm details"}
                </button>
              </div>
            </div>


            {/* Phase 5: Live Video Declaration */}
            <div className="order-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-navy/90 flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-navy/5 flex items-center justify-center text-[10px] text-navy font-bold">5</span>
                Self-Declaration Video Verification
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">

                {/* Video Preview or Webcam Capture Window */}
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden aspect-video flex flex-col items-center justify-center relative shadow-inner">
                  {isRecordingCameraActive ? (
                    <video
                      ref={setRecordVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : videoPreviewUrl ? (
                    <video
                      key={videoPreviewUrl}
                      src={videoPreviewUrl}
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-6 space-y-2 text-slate-400">
                      <Video size={36} className="mx-auto text-slate-300" />
                      <p className="text-xs">No video captured/uploaded yet.</p>
                    </div>
                  )}

                  {isVideoRecording && (
                    <div className="absolute top-3 left-3 bg-red-600 text-white px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1.5 animate-pulse">
                      <span className="h-2 w-2 rounded-full bg-white"></span>
                      Recording ({recordingTimeLeft}s)
                    </div>
                  )}
                </div>

                {/* Video Actions */}
                <div className="space-y-3">
                  <p className="text-xs text-navy/80 font-normal leading-relaxed">
                    Please say clearly: <strong>"My name is {fullName || "Agent"} and I am verifying my identity on Merlion Asset Holdings."</strong> Max length: 10 seconds.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {isRecordingCameraActive ? (
                      isVideoRecording ? (
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                        >
                          <span>Stop Recording</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                        >
                          <span>Start Recording</span>
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={startVideoCamera}
                        disabled={kycStatus === "under_review"}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-navy text-white hover:bg-navy-light rounded-xl text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                      >
                        <Video size={14} />
                        <span>{selfDeclarationVideo || selfDeclarationVideoFile ? "Record New Video" : "Record Live Video"}</span>
                      </button>
                    )}

                    {isRecordingCameraActive && !isVideoRecording && (
                      <button
                        type="button"
                        onClick={stopVideoCamera}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}

                    {kycStatus !== "under_review" && (
                      <label className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition">
                        <Upload size={14} />
                        <span>Upload Video</span>
                        <input
                          type="file"
                          accept="video/mp4,video/quicktime,video/webm"
                          onChange={handleVideoFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

              </div>
            </div>


            {/* Phase 3 and 4: Government ID Front & Back side */}
            <div className="order-4 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-navy/90 flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-navy/5 flex items-center justify-center text-[10px] text-navy font-bold">3–4</span>
                Government Identification (Govt ID) Documents
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* ID Front Side Card */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold tracking-wider text-navy/80 uppercase">
                    ID Front Side Photo
                  </label>

                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 hover:border-navy/20 rounded-2xl overflow-hidden aspect-[1.6/1] flex flex-col items-center justify-center relative transition shadow-inner">
                    {govtIdFront ? (
                      <>
                        <img
                          src={govtIdFront}
                          alt="ID Front Side"
                          className="w-full h-full object-cover"
                        />
                        {kycStatus !== "under_review" && (
                          <label className="absolute bottom-3 right-3 bg-white/90 backdrop-blur border border-slate-200/80 px-2.5 py-1 rounded-lg text-[10px] font-bold shadow hover:bg-white transition flex items-center gap-1 cursor-pointer">
                            <Upload size={10} />
                            Change File
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileChange(e, setGovtIdFront)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </>
                    ) : (
                      <label className="text-center p-4 space-y-2 text-slate-400 cursor-pointer w-full h-full flex flex-col justify-center">
                        <FileImage size={28} className="mx-auto text-slate-300" />
                        <span className="text-[10px] font-bold text-navy bg-navy/5 px-2.5 py-1 rounded-lg hover:bg-navy/10 transition inline-block">
                          Upload Front side
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, setGovtIdFront)}
                          className="hidden"
                          required
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* ID Back Side Card */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold tracking-wider text-navy/80 uppercase">
                    ID Back Side Photo
                  </label>

                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 hover:border-navy/20 rounded-2xl overflow-hidden aspect-[1.6/1] flex flex-col items-center justify-center relative transition shadow-inner">
                    {govtIdBack ? (
                      <>
                        <img
                          src={govtIdBack}
                          alt="ID Back Side"
                          className="w-full h-full object-cover"
                        />
                        {kycStatus !== "under_review" && (
                          <label className="absolute bottom-3 right-3 bg-white/90 backdrop-blur border border-slate-200/80 px-2.5 py-1 rounded-lg text-[10px] font-bold shadow hover:bg-white transition flex items-center gap-1 cursor-pointer">
                            <Upload size={10} />
                            Change File
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileChange(e, setGovtIdBack)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </>
                    ) : (
                      <label className="text-center p-4 space-y-2 text-slate-400 cursor-pointer w-full h-full flex flex-col justify-center">
                        <FileImage size={28} className="mx-auto text-slate-300" />
                        <span className="text-[10px] font-bold text-navy bg-navy/5 px-2.5 py-1 rounded-lg hover:bg-navy/10 transition inline-block">
                          Upload Back side
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, setGovtIdBack)}
                          className="hidden"
                          required
                        />
                      </label>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Submit Bar */}
            <div className="order-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-navy/80 font-normal max-w-md">
                By clicking "Save & Send Approval", you authorize Merlion Asset Holdings compliance team to securely review your submitted credentials.
              </p>

              <button
                type="submit"
                disabled={isSubmitting || kycStatus === "under_review"}
                id="submit-kyc-btn"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-navy hover:bg-navy-light text-white font-semibold rounded-xl text-xs transition duration-150 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer shrink-0 w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <ShieldCheck size={14} />
                )}
                <span>{isSubmitting ? "Uploading & Submitting…" : "Submit KYC"}</span>
              </button>
            </div>

            {isSubmitting && (
              <div className="order-7 relative overflow-hidden rounded-2xl border border-white/70 bg-[linear-gradient(135deg,#061A43_0%,#0A3475_52%,#1264D9_100%)] p-px shadow-[0_18px_44px_rgba(7,31,85,0.22)]">
                <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-blue-400/25 blur-3xl" />
                <div className="relative rounded-[15px] bg-[linear-gradient(135deg,rgba(5,22,55,0.98),rgba(8,45,101,0.95))] p-5 sm:p-6">
                  <div className="flex items-center gap-4">
                    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                      {uploadStage === "finalizing" ? (
                        <ShieldCheck size={20} className="text-cyan-200" />
                      ) : (
                        <RefreshCw size={20} className="animate-spin text-cyan-200" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-white">
                            {uploadStage === "finalizing" ? "Finalizing submission" : "Uploading documents"}
                          </p>
                          <p className="mt-0.5 text-[11px] font-medium text-blue-100/65">
                            {uploadStage === "finalizing"
                              ? "Saving your verification securely"
                              : "Secure transfer — retries automatically if your connection drops"}
                          </p>
                        </div>
                        <span className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1.5 font-mono text-xs font-bold tabular-nums text-cyan-100">
                          {uploadStage === "finalizing" ? 100 : overallUploadProgress}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 h-3 overflow-hidden rounded-full border border-white/10 bg-black/25 p-px">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#38BDF8_0%,#60A5FA_48%,#A5F3FC_100%)] transition-[width] duration-500 ease-out"
                      style={{ width: `${uploadStage === "finalizing" ? 100 : overallUploadProgress}%` }}
                    />
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {[
                      ["Selfie", uploadProgress.selfie],
                      ["ID Front", uploadProgress.idFront],
                      ["ID Back", uploadProgress.idBack],
                      ["Video", uploadProgress.video],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[10px] font-semibold text-blue-100/65">{label}</span>
                          <span className="font-mono text-[10px] font-bold tabular-nums text-cyan-100">{value}%</span>
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/25">
                          <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-200 transition-[width] duration-500" style={{ width: `${value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.14em] text-blue-100/45">
                    <span>Encrypted transfer</span>
                    <span>{uploadStage === "finalizing" ? "Verification queued" : "In progress"}</span>
                  </div>
                </div>
              </div>
            )}

          </form>
        </div>

      </main>

      {/* KYC Under Review Popup Modal */}
      {showPopup && (
        <div className="fixed inset-0 bg-navy/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl relative">
            <div className="h-16 w-16 bg-amber-50 text-amber-500 rounded-full border border-amber-100 flex items-center justify-center mx-auto mb-5 shadow-sm">
              <Shield size={32} className="animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-navy">KYC Under Review</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-2.5">
              Your identity photos have been saved. Once Successful Approval by our Compliance officers, your dashboard will become live.
            </p>
            <button
              onClick={() => {
                setShowPopup(false);
                fetchUserData();
              }}
              className="mt-6 w-full py-2.5 bg-navy hover:bg-navy-light text-white font-semibold rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Acknowledge</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-navy/70 font-normal">
          © 2026 Merlion Asset Holdings. All rights reserved. Registered Singapore financial partner.
        </div>
      </footer>
    </div>
  );
}
