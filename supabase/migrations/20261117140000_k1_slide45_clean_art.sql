-- स्लाइड 4 व 5: मालिक के नए साफ़ चित्र। 4 = सदस्यता व डिजिटल पहचान पत्र, 5 = सामाजिक नेटवर्क (शोध वाली स्लाइड हटी)
update public.homepage_slides set image = '/slides/k1-4b.jpg',
  subtitle = 'Digital membership for every member', subtitle_hi = 'हर सदस्य की डिजिटल सदस्यता',
  title = 'Your Identity. Your Membership.', title_hi = 'आपकी पहचान। आपकी सदस्यता।',
  description = 'Join your organization online, get a verified digital membership ID with a QR code, and keep your profile, membership and activities in one place.',
  description_hi = 'अपनी संस्था से ऑनलाइन जुड़िए, QR कोड वाला प्रमाणित डिजिटल सदस्यता पहचान पत्र पाइए, और अपनी प्रोफ़ाइल, सदस्यता व गतिविधियाँ एक ही जगह रखिए।',
  features = E'Online membership\nDigital ID with QR code\nVerified members\nMy organization\nEvents & activities\nSafe & private',
  features_hi = E'ऑनलाइन सदस्यता\nQR कोड वाला डिजिटल पहचान पत्र\nप्रमाणित सदस्य\nमेरी संस्था\nआयोजन व गतिविधियाँ\nसुरक्षित व निजी',
  button_text = 'Become a Member', button_text_hi = 'सदस्य बनें', button_url = '/join',
  button2_text = 'Find Your Organization', button2_text_hi = 'अपनी संस्था खोजें', button2_url = '/organizations'
where image = '/slides/k1-5.jpg';

update public.homepage_slides set image = '/slides/k1-5b.jpg', display_order = 5,
  button2_text = 'Business Directory', button2_text_hi = 'व्यापार निर्देशिका', button2_url = '/business'
where image = '/slides/k1-4.jpg';

update public.homepage_slides set display_order = 4 where image = '/slides/k1-4b.jpg';
