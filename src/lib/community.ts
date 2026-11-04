// Shared bits for the community modules (listings, matrimony, polls).
export type ListingKind = "business" | "job" | "scholarship" | "professional" | "emergency";
export type Listing = { id: string; kind: ListingKind; title: string; title_hi: string | null; body: string | null; body_hi: string | null; category: string | null; fields: Record<string, string>; contact_name: string | null; phone: string | null; email: string | null; website: string | null; address: string | null; city: string | null; district: string | null; state: string | null; image: string | null; status: string; featured: boolean; expires_at: string | null; submitted_by: string | null; admin_note: string | null; views: number; created_at: string };

export const KIND_LABEL: Record<ListingKind, { en: string; hi: string; path: string; blurb_en: string; blurb_hi: string }> = {
  business: { en: "Business directory", hi: "व्यापार निर्देशिका", path: "/directory", blurb_en: "Shops, services and enterprises run by community members.", blurb_hi: "समाज के लोगों की दुकानें, सेवाएँ और उद्यम।" },
  professional: { en: "Professionals", hi: "पेशेवर", path: "/directory", blurb_en: "Doctors, lawyers, engineers, teachers and more.", blurb_hi: "डॉक्टर, वकील, इंजीनियर, शिक्षक और अन्य।" },
  job: { en: "Jobs", hi: "रोज़गार", path: "/jobs", blurb_en: "Openings shared by members and partner organizations.", blurb_hi: "सदस्यों और साझेदार संस्थाओं द्वारा साझा रिक्तियाँ।" },
  scholarship: { en: "Scholarships", hi: "छात्रवृत्ति", path: "/scholarships", blurb_en: "Scholarships and education support.", blurb_hi: "छात्रवृत्ति और शिक्षा सहायता।" },
  emergency: { en: "Emergency help", hi: "आपात सहायता", path: "/help", blurb_en: "Blood, ambulance, hospital contacts and urgent help.", blurb_hi: "रक्त, एम्बुलेंस, अस्पताल संपर्क और तत्काल सहायता।" },
};

/** Kind-specific extra fields shown on the submit form and cards. */
export const KIND_FIELDS: Record<ListingKind, { key: string; en: string; hi: string }[]> = {
  business: [{ key: "hours", en: "Opening hours", hi: "समय" }, { key: "since", en: "Established", hi: "स्थापना वर्ष" }],
  professional: [{ key: "qualification", en: "Qualification", hi: "योग्यता" }, { key: "experience", en: "Experience", hi: "अनुभव" }, { key: "clinic", en: "Clinic / office", hi: "क्लिनिक / कार्यालय" }],
  job: [{ key: "company", en: "Company", hi: "संस्था" }, { key: "salary", en: "Salary", hi: "वेतन" }, { key: "qualification", en: "Qualification", hi: "योग्यता" }, { key: "last_date", en: "Last date", hi: "अंतिम तिथि" }],
  scholarship: [{ key: "amount", en: "Amount", hi: "राशि" }, { key: "eligibility", en: "Eligibility", hi: "पात्रता" }, { key: "last_date", en: "Last date", hi: "अंतिम तिथि" }, { key: "apply_url", en: "Apply link", hi: "आवेदन link" }],
  emergency: [{ key: "service", en: "Service (blood / ambulance / hospital / police…)", hi: "सेवा" }, { key: "available", en: "Availability (24×7 / hours)", hi: "उपलब्धता" }],
};
