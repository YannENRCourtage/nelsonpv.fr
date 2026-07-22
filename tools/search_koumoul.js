async function run() {
  try {
    const res = await fetch('https://opendata.enedis.fr/api/v1/datasets?size=1000');
    if (!res.ok) {
        console.log("Koumoul API failed: ", res.status);
    }
  } catch(e) {}
}
run();
