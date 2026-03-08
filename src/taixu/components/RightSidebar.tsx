import React from 'react';
import BondsSection from './sidebar/BondsSection';
import EquipmentSection from './sidebar/EquipmentSection';
import CultivationSection from './sidebar/CultivationSection';
import EvilArtifactsSection from './sidebar/EvilArtifactsSection';
import SpiritPetsSection from './sidebar/SpiritPetsSection';
import PowerSection from './sidebar/PowerSection';
import SystemStatus from './sidebar/SystemStatus';
import SystemSettingsGroup from './sidebar/SystemSettingsGroup';
import TianjiSection from './sidebar/TianjiSection';

interface Props {
  state: any;
  inventory: any;
  bonds: any;
  equipment: any;
  pets: any[];
  evilArtifacts: any[];
  cultivation: any;
  onOpenDetail: (item: any) => void;
  authorities: any;
  isOpen: boolean;
  isFullscreen?: boolean;
  onOpenModal: (type: string, data?: any) => void;
  onOpenAuthority: (name: string, data: any) => void;
}

const RightSidebar: React.FC<Props> = ({
  state, bonds, equipment, pets, evilArtifacts, cultivation, onOpenDetail, authorities, isOpen, isFullscreen, onOpenModal, onOpenAuthority
}) => {
  const topClass = isFullscreen ? 'top-0 md:top-20' : 'top-0';
  return (
    <aside
      className={`absolute right-0 ${topClass} bottom-0 jade-gradient border-l border-emerald-100 z-60 overflow-y-auto p-5 shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      style={{ width: 'min(var(--taixujie-sidebar-width, 320px), 85vw)' }}
    >
      <SystemStatus state={state} />

      <PowerSection
        authorities={authorities}
        onOpenAuthority={onOpenAuthority}
        onOpenModal={onOpenModal}
      />

      <CultivationSection
        cultivation={cultivation}
        onOpenDetail={onOpenDetail}
      />

      <EquipmentSection
        equipment={equipment}
        onOpenDetail={onOpenDetail}
      />

      <SpiritPetsSection pets={pets} onOpenDetail={onOpenDetail} />

      <EvilArtifactsSection artifacts={evilArtifacts} onOpenDetail={onOpenDetail} />

      <BondsSection
        bonds={bonds}
        onOpenModal={onOpenModal}
      />

      <TianjiSection onOpenModal={onOpenModal} />

      <SystemSettingsGroup onOpenModal={onOpenModal} />
    </aside>
  );
};

export default RightSidebar;
