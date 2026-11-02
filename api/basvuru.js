const kac = (s) =>
  String(s ?? "-").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ hata: "Yalnizca POST" });

  const k = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  if (!k.ad_soyad || !k.telefon || !k.marka) return res.status(400).json({ hata: "Eksik bilgi" });

  const { RESEND_API_KEY, BILDIRIM_MAIL } = process.env;
  if (!RESEND_API_KEY || !BILDIRIM_MAIL) {
    return res.status(500).json({ hata: "RESEND_API_KEY veya BILDIRIM_MAIL tanimli degil" });
  }

  const satir = (e, d) => `<tr><td style="padding:6px 12px;color:#666">${e}</td><td style="padding:6px 12px"><b>${kac(d)}</b></td></tr>`;
  const foto = (k.fotograflar || []).slice(0, 8)
    .filter((u) => typeof u === "string" && u.startsWith("https://"))
    .map((u, i) => `<a href="${kac(u)}">Fotograf ${i + 1}</a>`).join(" &nbsp; ") || "Yok";

  const html = `
    <h2>Yeni arac satis basvurusu</h2>
    <p><b>${kac(k.ad_soyad)}</b> - <a href="tel:${kac(k.telefon)}">${kac(k.telefon)}</a></p>
    <table style="border-collapse:collapse">
      ${satir("Arac", `${k.marka} ${k.model || ""}`)}
      ${satir("Yil", k.yil)}${satir("Kilometre", k.kilometre)}
      ${satir("Yakit", k.yakit)}${satir("Vites", k.vites)}
      ${satir("Kasa", k.kasa)}${satir("Renk", k.renk)}${satir("Motor / paket", k.motor_paket)}
      ${satir("Boya / degisen", k.boya_durumu)}${satir("Hasar kaydi", k.hasar_kaydi)}${satir("Agir hasar", k.agir_hasar)}
      ${satir("Ek bilgi", k.ek_bilgi)}
      ${satir("E-posta", k.eposta)}${satir("Sehir", k.sehir)}
    </table>
    <p>Fotograflar: ${foto}</p>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "UC CARS <onboarding@resend.dev>",
      to: [BILDIRIM_MAIL],
      subject: `Yeni basvuru: ${k.marka} ${k.model || ""} - ${k.ad_soyad}`,
      html,
    }),
  });

  if (!r.ok) {
    const detay = await r.text();
    console.error("Resend hatasi", r.status, detay);
    return res.status(502).json({ hata: "Mail gonderilemedi", detay });
  }
  return res.status(200).json({ tamam: true });
}
