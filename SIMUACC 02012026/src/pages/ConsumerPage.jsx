import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Calculator, TrendingDown, Zap, PieChart as PieChartIcon } from 'lucide-react';
import SimulatorForm from '@/components/SimulatorForm';
import ResultsDisplay from '@/components/ResultsDisplay';
import { getProcessedTariffData } from '@/data/tariffData';

const processedTariffData = getProcessedTariffData();

const initialFormData = {
  provider: '',
  offer: '',
  tariffType: '',
  power: '',
  consumption: '5000',
  accPercentage: 40,
  currentPrice: '',
  accPrice: '0.12',
};

const ConsumerPage = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const { provider, offer, tariffType, power } = formData;
    if (provider && offer && tariffType && power) {
      const selectedTariff = processedTariffData.find(
        t => t.provider === provider && 
             t.offer === offer && 
             t.tariffType === tariffType && 
             t.power === parseInt(power)
      );
      if (selectedTariff) {
        setFormData(prev => ({ ...prev, currentPrice: selectedTariff.price.toString() }));
      } else {
         setFormData(prev => ({ ...prev, currentPrice: '' }));
      }
    }
  }, [formData.provider, formData.offer, formData.tariffType, formData.power]);

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'provider' && { offer: '', tariffType: '', power: '', currentPrice: '' }),
      ...(field === 'offer' && { tariffType: '', power: '', currentPrice: '' }),
      ...(field === 'tariffType' && { power: '', currentPrice: '' }),
    }));
    if (results) setResults(null);
  };

  const handleReset = useCallback(() => {
    setFormData(initialFormData);
    setResults(null);
  }, []);

  const calculateResults = () => {
    const { consumption, accPercentage, currentPrice, accPrice, provider, offer, tariffType, power } = formData;

    if (!consumption || !currentPrice || !accPrice) {
      return;
    }

    const selectedTariff = processedTariffData.find(
      t => t.provider === provider && 
           t.offer === offer && 
           t.tariffType === tariffType && 
           t.power === parseInt(power)
    );
    const contractType = selectedTariff ? selectedTariff.type : 'RES'; // Default to residential

    const annualConsumption = parseFloat(consumption);
    const providerPriceHT = parseFloat(currentPrice);
    const accPriceHT = parseFloat(accPrice);
    const turpeRate = 0.04; 
    const vatRate = 0.20;

    const exciseRate = contractType === 'PRO' ? 0.02579 : 0.02998;

    const accConsumption = (annualConsumption * accPercentage) / 100;
    const providerConsumption = annualConsumption - accConsumption;

    // --- Calculation WITHOUT ACC ---
    const costWithoutACC_HT = annualConsumption * providerPriceHT;
    const turpeWithoutACC = annualConsumption * turpeRate;
    const exciseTaxWithoutAccHT = annualConsumption * exciseRate;
    const subtotalWithoutACC = costWithoutACC_HT + turpeWithoutACC + exciseTaxWithoutAccHT;
    const vatWithoutACC = subtotalWithoutACC * vatRate;
    const totalCostWithoutACC_TTC = subtotalWithoutACC + vatWithoutACC;

    // --- Calculation WITH ACC ---
    const providerCostHT = providerConsumption * providerPriceHT;
    const accCostHT = accConsumption * accPriceHT;
    const totalEnergyCostWithACC_HT = providerCostHT + accCostHT;
    const turpeWithACC = annualConsumption * turpeRate; 
    const exciseTaxWithAccHT = providerConsumption * exciseRate;
    const subtotalWithACC = totalEnergyCostWithACC_HT + turpeWithACC + exciseTaxWithAccHT;
    const vatWithACC = subtotalWithACC * vatRate;
    const totalCostWithACC_TTC = subtotalWithACC + vatWithACC;
    
    const savings = totalCostWithoutACC_TTC - totalCostWithACC_TTC;
    const savingsPercentage = totalCostWithoutACC_TTC > 0 ? (savings / totalCostWithoutACC_TTC) * 100 : 0;

    setResults({
      providerName: formData.provider,
      annualConsumption,
      accConsumption,
      providerConsumption,
      accPercentage,
      totalCostWithoutACC_TTC,
      totalCostWithACC_TTC,
      savings,
      savingsPercentage,
      currentPrice,
      accPrice,
      componentsWithoutACC: {
        energy: costWithoutACC_HT,
        turpe: turpeWithoutACC,
        vat: vatWithoutACC,
        excise: exciseTaxWithoutAccHT,
      },
      componentsWithACC: {
        providerEnergy: providerCostHT,
        accEnergy: accCostHT,
        turpe: turpeWithACC,
        vat: vatWithACC,
        excise: exciseTaxWithAccHT,
      },
    });
  };

  return (
    <>
      <Helmet>
        <title>Simulateur Consommateur ACC - ENR Courtage Energie</title>
        <meta name="description" content="Calculez vos économies avec l'autoconsommation collective (ACC). Comparez votre fournisseur actuel avec les tarifs ACC et découvrez vos économies potentielles." />
      </Helmet>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-green-600 to-yellow-600 bg-clip-text text-transparent mb-4">
            Simulateur d'Autoconsommation Collective
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez combien vous pouvez économiser en rejoignant une communauté d'autoconsommation collective.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-5"
          >
            <SimulatorForm
              formData={formData}
              onFormChange={handleFormChange}
              onCalculate={calculateResults}
              onReset={handleReset}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:col-span-7 sticky top-28"
          >
            {results ? (
              <ResultsDisplay results={results} formData={formData} />
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-8 h-full flex flex-col items-center justify-center text-center">
                <div className="bg-gradient-to-br from-blue-100 to-green-100 rounded-full p-6 mb-6">
                  <Calculator className="w-16 h-16 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  Prêt à calculer vos économies ?
                </h3>
                <p className="text-gray-600 max-w-md">
                  Remplissez le formulaire pour découvrir vos économies potentielles avec l'ACC.
                </p>
                <div className="grid grid-cols-3 gap-4 mt-8 w-full max-w-md">
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <Zap className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-blue-900">Énergie locale</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <TrendingDown className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-green-900">Économies</p>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4 text-center">
                    <PieChartIcon className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-yellow-900">Analyse</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default ConsumerPage;