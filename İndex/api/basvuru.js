export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ hata: "Yalnızca POST" });

  const k = req.body || {};
  const temiz = (s) => String(s ?? "-").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

  const fotolar = (Array.isArray(k.fotograflar) ? k.fotograflar : [])
    .filter((u) => typeof u === "string" && u.startsWith(process.env.SUPABASE_URL))
    .map((u, i) => `<a href="${u}">Fotoğraf ${i + 1}</a>`)
    .join(" &nbsp; ") || "Fotoğraf yüklenmedi";

  const satir = (ad, deger) => `<tr><td style="padding:6px 12px;color:#667">${ad}</td><td style="padding:6px 12px"><b>${temiz(deger)}</b></td></tr>`;

  const html = `
    <h2>Yeni Araç Satış Başvurusu</h2>
    <table style="border-collapse:collapse;font-family:Arial,sans-serif">
      ${satir("Ad Soyad", k.ad_soyad)}
      ${satir("Telefon", k.telefon)}
      ${satir("E-posta", k.eposta)}
      ${satir("Şehir", k.sehir)}
      ${satir("Araç", `${k.marka} ${k.model} (${k.yil})`)}
      ${satir("Kilometre", k.kilometre)}
      ${satir("Yakıt / Vites", `${k.yakit} / ${k.vites}`)}
      ${satir("Kasa / Renk", `${k.kasa || "-"} / ${k.renk || "-"}`)}
      ${satir("Motor / Paket", k.motor_paket)}
      ${satir("Boya / Değişen", k.boya_durumu)}
      ${satir("Hasar kaydı", k.hasar_kaydi)}
      ${satir("Ağır hasar", k.agir_hasar)}
      ${satir("Ek bilgi", k.ek_bilgi)}
    </table>
    <p>${fotolar}</p>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "UC CARS <onboarding@resend.dev>",
        to: [process.env.BILDIRIM_MAIL],
        subject: `Yeni başvuru: ${temiz(k.marka)} ${temiz(k.model)} ${temiz(k.yil)} - ${temiz(k.ad_soyad)}`,
        html,
      }),
    });
    if (!r.ok) throw new Error(await r.text());
    return res.status(200).json({ tamam: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ hata: "Mail gönderilemedi" });
  }
}
