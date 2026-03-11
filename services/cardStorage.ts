import { supabase } from './supabase';
import { ValentineData } from '../types';

export interface StoredCard extends ValentineData {
  id: string;
}

const BUCKET_NAME = 'valentines';

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, raw] = dataUrl.split(',');
  const mimeMatch = meta.match(/data:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(raw);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveCard(data: ValentineData): Promise<StoredCard> {
  const id = generateId();

  // Upload each photo to Supabase Storage and collect public URLs
  const uploadedPhotoUrls: string[] = [];

  for (let i = 0; i < data.photoUrls.length; i++) {
    const photo = data.photoUrls[i];
    if (!photo) continue;

    const path = `${id}/photo-${i}.jpg`;
    const blob = dataUrlToBlob(photo);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading photo', uploadError);
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    if (publicUrlData?.publicUrl) {
      uploadedPhotoUrls.push(publicUrlData.publicUrl);
    }
  }

  const payload = {
    id,
    recipient_name: data.recipientName,
    special_date: data.specialDate,
    photo_urls: uploadedPhotoUrls,
    quotes: data.quotes,
    message: data.message,
  };

  const { data: rows, error } = await supabase
    .from('cards')
    .upsert(payload)
    .select()
    .limit(1);

  if (error) {
    console.error('Error saving card row', error);
    throw error;
  }

  const row = rows && rows[0] ? rows[0] : payload;

  return {
    id,
    recipientName: row.recipient_name,
    specialDate: row.special_date,
    photoUrls: row.photo_urls || uploadedPhotoUrls,
    quotes: row.quotes || data.quotes,
    message: row.message || data.message,
  };
}

export async function loadCard(id: string): Promise<StoredCard | null> {
  const { data: row, error } = await supabase
    .from('cards')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error loading card', error);
    throw error;
  }

  if (!row) return null;

  return {
    id: row.id,
    recipientName: row.recipient_name,
    specialDate: row.special_date,
    photoUrls: row.photo_urls || [],
    quotes: row.quotes || [],
    message: row.message || '',
  };
}

