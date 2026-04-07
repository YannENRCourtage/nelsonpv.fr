
function calculateOpex(buildings) {
    const n = buildings.length;
    const baseMaint = 1734.2;
    const incrementMaint = 0.2 * baseMaint;
    const maint = baseMaint + (n - 1) * incrementMaint;
    const baseAssur = 867.1;
    const nBAC = buildings.filter(b => b.type !== 'BE').length;
    const nBE = buildings.filter(b => b.type === 'BE').length;
    let assur = baseAssur;
    if (nBAC > 0) {
        assur = baseAssur * (1 + 0.8 * (nBAC - 1) + 0.1 * nBE);
    } else if (nBE > 0) {
        assur = baseAssur * (1 + 0.3 * (nBE - 1));
    }
    return { maint: Number(maint.toFixed(2)), assur: Number(assur.toFixed(2)) };
}
console.log('Maintenance Tests:');
console.log('2 bldgs:', calculateOpex([{}, {}]).maint, 'Expected: 2081.04');
console.log('3 bldgs:', calculateOpex([{}, {}, {}]).maint, 'Expected: 2427.88');
console.log('4 bldgs:', calculateOpex([{}, {}, {}, {}]).maint, 'Expected: 2774.72');
console.log('\nAssurance Tests:');
console.log('2 BAC:', calculateOpex([{type:'BAC'}, {type:'BAC'}]).assur, 'Expected: 1560.78');
console.log('3 BAC:', calculateOpex([{type:'BAC'}, {type:'BAC'}, {type:'BAC'}]).assur, 'Expected: 2254.46');
console.log('4 BAC:', calculateOpex([{type:'BAC'}, {type:'BAC'}, {type:'BAC'}, {type:'BAC'}]).assur, 'Expected: 2948.14');
console.log('2 BE:', calculateOpex([{type:'BE'}, {type:'BE'}]).assur, 'Expected: 1127.23');
console.log('3 BE:', calculateOpex([{type:'BE'}, {type:'BE'}, {type:'BE'}]).assur, 'Expected: 1387.36');
console.log('4 BE:', calculateOpex([{type:'BE'}, {type:'BE'}, {type:'BE'}, {type:'BE'}]).assur, 'Expected: 1647.49');
console.log('1 BAC + 1 BE:', calculateOpex([{type:'BAC'}, {type:'BE'}]).assur, 'Expected: 953.81');
