import React from 'react';
import { AttributeRow, ProgressBar } from '../UIElements';

interface Props {
  char: any;
}

const AttributeSection: React.FC<Props> = ({ char = {} }) => {
  return (
    <>
      <section className="mb-8">
        <h3 className="text-emerald-800 font-bold mb-4 border-b border-emerald-200 pb-2">
          修行之路
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="font-bold text-slate-800">寿元</span>
            <span className="font-bold text-slate-800">
              {char.寿元 ? `${char.寿元}岁` : '未知'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-slate-800">当前境界</span>
            <span className="font-bold text-slate-800">
              {char.境界} <i className="font-normal text-slate-600 ml-1">({char.境界映射})</i>
            </span>
          </div>
          <ProgressBar label="修行进度" current={char.修行进度} max={100} colorClass="bg-cyan-400" />
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-emerald-800 font-bold mb-4 border-b border-emerald-200 pb-2">
          核心属性
        </h3>
        <ProgressBar label="生命值" current={char.当前生命} max={char.最大生命} colorClass="bg-rose-400" />
        <ProgressBar label="灵气值" current={char.当前灵气} max={char.最大灵气} colorClass="bg-emerald-400" />
        <ProgressBar label="道心" current={char.当前道心} max={char.最大道心} colorClass="bg-indigo-400" />
      </section>

      <section className="mb-8">
        <h3 className="text-emerald-800 font-bold mb-4 border-b border-emerald-200 pb-2">
          战斗属性
        </h3>
        <AttributeRow label="根骨" current={char.当前根骨} base={char.基础根骨} />
        <AttributeRow label="神海" current={char.当前神海} base={char.基础神海} />
        <AttributeRow label="身法" current={char.当前身法} base={char.基础身法} />
        <AttributeRow label="横练" current={char.当前横练} base={char.基础横练} />
        <AttributeRow label="杀伐" current={char.当前杀伐} base={char.基础杀伐} />
        <AttributeRow label="神伤" current={char.当前神伤} base={char.基础神伤} />
      </section>

      <section className="mb-8">
        <h3 className="text-emerald-800 font-bold mb-4 border-b border-emerald-200 pb-2">
          潜质
        </h3>
        <AttributeRow label="悟性" current={char.当前悟性} base={char.基础悟性} colorClass="text-blue-500" />
        <AttributeRow label="魅力" current={char.当前魅力} base={char.基础魅力} colorClass="text-pink-500" />
        <AttributeRow label="气运" current={char.当前气运} base={char.基础气运} colorClass="text-amber-500" />
      </section>
    </>
  );
};

export default AttributeSection;
