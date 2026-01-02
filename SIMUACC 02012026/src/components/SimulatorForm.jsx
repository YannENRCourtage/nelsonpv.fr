import React from 'react';
import { motion } from 'framer-motion';
import { Calculator, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { getProcessedTariffData } from '@/data/tariffData';
import { sourceLinks } from '@/data/sourceLinks';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

const processedTariffData = getProcessedTariffData();

const SourceModal = () => (
    <Dialog>
        <DialogTrigger asChild>
            <Button variant="link" className="p-0 h-auto flex items-center gap-1 text-xs text-blue-600 hover:underline">
                <Info size={16} /> Voir les sources
            </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
                <DialogTitle>Sources des informations tarifaires</DialogTitle>
            </DialogHeader>
            <div className="py-4 max-h-96 overflow-y-auto">
                <ul className="list-disc list-inside space-y-2 text-sm">
                    {sourceLinks.map((link, index) => (
                      <li key={index}>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {link.name}
                        </a>
                      </li>
                    ))}
                </ul>
            </div>
            <DialogFooter>
                 <DialogTrigger asChild>
                    <Button type="button" variant="secondary">Fermer</Button>
                </DialogTrigger>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

const SimulatorForm = ({ formData, onFormChange, onCalculate, onReset }) => {
  const providers = [...new Set(processedTariffData.map(t => t.provider))];
  
  const offers = formData.provider
    ? [...new Set(processedTariffData.filter(t => t.provider === formData.provider).map(t => t.offer))].sort()
    : [];
  
  const tariffTypes = formData.provider && formData.offer
    ? [...new Set(processedTariffData.filter(t => t.provider === formData.provider && t.offer === formData.offer).map(t => t.tariffType))].sort()
    : [];
  
  const powers = formData.provider && formData.offer && formData.tariffType
    ? [...new Set(processedTariffData.filter(t => 
        t.provider === formData.provider && 
        t.offer === formData.offer && 
        t.tariffType === formData.tariffType
      ).map(t => t.power))].sort((a, b) => a - b)
    : [];

  const isFormValid = formData.provider && formData.offer && formData.tariffType && formData.power && formData.consumption && formData.currentPrice && formData.accPrice;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-green-500 rounded-lg p-2.5">
          <Calculator className="w-6 h-6 text-white" />
        </div>
        Vos informations
      </h2>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="provider" className="text-sm font-semibold text-gray-700 mb-2 block">Fournisseur</Label>
              <select
                id="provider"
                value={formData.provider}
                onChange={(e) => onFormChange('provider', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
              >
                <option value="">Sélectionnez...</option>
                {providers.map(p => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
            <div>
              <Label htmlFor="offer" className="text-sm font-semibold text-gray-700 mb-2 block">Offre</Label>
              <select
                id="offer"
                value={formData.offer}
                onChange={(e) => onFormChange('offer', e.target.value)}
                disabled={!formData.provider}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none disabled:bg-gray-100"
              >
                <option value="">Sélectionnez...</option>
                {offers.map(o => (<option key={o} value={o}>{o}</option>))}
              </select>
            </div>
            <div>
              <Label htmlFor="tariffType" className="text-sm font-semibold text-gray-700 mb-2 block">Type de tarif</Label>
              <select
                id="tariffType"
                value={formData.tariffType}
                onChange={(e) => onFormChange('tariffType', e.target.value)}
                disabled={!formData.offer}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none disabled:bg-gray-100"
              >
                <option value="">Sélectionnez...</option>
                {tariffTypes.map(t => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
            <div>
              <Label htmlFor="power" className="text-sm font-semibold text-gray-700 mb-2 block">Puissance (kVA)</Label>
              <select
                id="power"
                value={formData.power}
                onChange={(e) => onFormChange('power', e.target.value)}
                disabled={!formData.tariffType}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none disabled:bg-gray-100"
              >
                <option value="">Sélectionnez...</option>
                {powers.map(p => (<option key={p} value={p}>{p} kVA</option>))}
              </select>
            </div>
        </div>

        <div>
            <Label htmlFor="currentPrice" className="text-sm font-semibold text-gray-700 mb-2 block">
                Votre tarif actuel (€/kWh HT)*
            </Label>
          <Input
            id="currentPrice"
            type="number"
            step="0.0001"
            value={formData.currentPrice}
            onChange={(e) => onFormChange('currentPrice', e.target.value)}
            placeholder="Ex: 0.1436"
            disabled={!formData.power}
          />
           <div className="mt-2">
                <SourceModal />
            </div>
        </div>

        <div>
          <Label htmlFor="consumption" className="text-sm font-semibold text-gray-700 mb-2 block">Consommation annuelle (kWh)</Label>
          <Input
            id="consumption"
            type="number"
            value={formData.consumption}
            onChange={(e) => onFormChange('consumption', e.target.value)}
            placeholder="Ex: 5000"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <Label htmlFor="accPrice" className="text-sm font-semibold text-gray-700 mb-2 block">Tarif ACC (€/kWh HT)</Label>
            <Input
              id="accPrice"
              type="number"
              step="0.005"
              value={formData.accPrice}
              onChange={(e) => onFormChange('accPrice', e.target.value)}
              placeholder="Ex: 0.08"
            />
          </div>
           <div>
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">
              Part d'ACC: {formData.accPercentage}%
            </Label>
            <div className="px-2">
              <Slider
                value={[formData.accPercentage]}
                onValueChange={(value) => onFormChange('accPercentage', value[0])}
                min={0} max={100} step={5}
                className="w-full"
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-grow">
              <Button
                onClick={onCalculate}
                disabled={!isFormValid}
                className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-bold py-4 text-lg rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Calculator className="w-5 h-5 mr-2" />
                Calculer
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button onClick={onReset} variant="outline" className="w-full h-full text-base">
                    Reset
                </Button>
            </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SimulatorForm;