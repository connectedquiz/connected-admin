// connected-admin/lib/firebase-admin.ts

import { App, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";
import * as path from "path";
import * as fs from "fs";

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  // Read service account JSON directly from disk — bypasses all Windows
  // env var private key formatting issues entirely
  const serviceAccountPath = path.join(process.cwd(), "service-account.json");
  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, "utf-8")
  );

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}