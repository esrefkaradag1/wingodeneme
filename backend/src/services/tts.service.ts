import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const TTS_VOICE = process.env.TTS_VOICE?.trim() || 'tr-TR-EmelNeural';
const TTS_RATE = process.env.TTS_RATE?.trim() || '-4%';
const TTS_PITCH = process.env.TTS_PITCH?.trim() || '-2Hz';

let ttsInstance: MsEdgeTTS | null = null;

async function edgeTts(): Promise<MsEdgeTTS> {
  if (!ttsInstance) {
    ttsInstance = new MsEdgeTTS();
    await ttsInstance.setMetadata(TTS_VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  }
  return ttsInstance;
}

/** Microsoft Edge Neural TTS — doğal Türkçe öğretmen sesi */
export async function metinSesUret(metin: string): Promise<Buffer> {
  const temiz = String(metin || '').trim().slice(0, 800);
  if (!temiz) throw new Error('Boş metin');

  const tts = await edgeTts();
  const { audioStream } = tts.toStream(temiz, {
    rate: TTS_RATE,
    pitch: TTS_PITCH,
  });

  const parcalar: Buffer[] = [];
  for await (const chunk of audioStream) {
    parcalar.push(Buffer.from(chunk));
  }

  const buffer = Buffer.concat(parcalar);
  if (buffer.length < 100) throw new Error('Ses üretilemedi');
  return buffer;
}
