import React from 'react';
import AttributeSection from './sidebar/AttributeSection';
import CharacterHeader from './sidebar/CharacterHeader';
import ClothingSection from './sidebar/ClothingSection';
import StatusSection from './sidebar/StatusSection';

interface Props {
  char?: any;
  body?: any;
  uterus?: any;
  clothing?: any;
  talents?: any;
  isOpen: boolean;
  isFullscreen?: boolean;
  onOpenDetail: (item: { label: string; data: any; type: 'clothing' | 'talent' }) => void;
}

const LeftSidebar: React.FC<Props> = ({
  char = {}, body = {}, uterus = {}, clothing = {}, talents = {}, isOpen, isFullscreen, onOpenDetail
}) => {
  const topClass = isFullscreen ? 'top-0 md:top-20' : 'top-0';
  return (
    <aside
      className={`absolute left-0 ${topClass} bottom-0 jade-gradient border-r border-emerald-100 z-60 overflow-y-auto p-5 shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      style={{ width: 'min(var(--taixujie-sidebar-width, 320px), 85vw)' }}
    >
      <CharacterHeader
        name={char.宿主}
        talents={talents}
        thoughts={char.内心想法}
        dependencyEval={char.$依存评价}
        onOpenDetail={onOpenDetail as any}
      />

      <AttributeSection char={char} />

      <ClothingSection
        clothing={clothing}
        onOpenDetail={onOpenDetail as any}
      />

      <StatusSection
        char={char}
        body={body}
        uterus={uterus}
      />
    </aside>
  );
};

export default LeftSidebar;
