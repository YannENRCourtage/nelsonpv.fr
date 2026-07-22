async function run() {
  try {
    const res = await fetch('https://opendata.enedis.fr/api/v1/sitemap/datasets.xml');
    const text = await res.text();
    const urls = text.match(/<loc>(.*?)<\/loc>/g).map(u => u.replace(/<\/?loc>/g, ''));
    const contraintes = urls.filter(u => u.includes('contrainte') || u.includes('capacit') || u.includes('satur'));
    console.log("Found:", contraintes.length);
    contraintes.forEach(u => console.log(u));
  } catch(e) {}
}
run();
