async function run() {
  try {
    const res = await fetch('https://data.enedis.fr/api/explore/v2.1/catalog/datasets?limit=100');
    console.log(await res.text());
  } catch(e) {
    console.error(e);
  }
}
run();
