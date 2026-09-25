"use client";

import { useState } from "react";
import { Profile } from "@/types";
import EditProfileModal from "./EditProfileModal";
import styles from "./ProfileEditButton.module.css";

export default function ProfileEditButton({ profile, section = "profile" }: { profile: Profile; section?: string }) {
  const [open, setOpen] = useState(false);
  return <>{<button className={styles.button} onClick={() => setOpen(true)}>Edit settings</button>}{open && <EditProfileModal profile={profile} section={section} onClose={() => setOpen(false)} />}</>;
}