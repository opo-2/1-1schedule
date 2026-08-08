import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Tag, message } from 'antd';
import { CloseOutlined, PlusOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { ScheduleEvent, getColorForCategory } from '../types';
import { saveEvent, fetchEvents, generateId } from '../store/scheduleStore';
import { minToTime, timeToMin, getPresets, PresetItem } from '../store/utils';

interface PopupFormProps {
  defaultHour: number;
}

interface SegmentEntry {
  id: string;
  startMin: number;
  endMin: number;
  description: string;
  category: string;
  color: string;
  status: 'completed' | 'in_progress';
}

const PopupForm: React.FC<PopupFormProps> = ({ defaultHour }) => {
  const rangeStartHour = Math.max(0, defaultHour - 2);
  const rangeEndHour = defaultHour;

  const rangeStartMin = rangeStartHour * 60;
  const rangeEndMin = rangeEndHour * 60;

  const [startMin, setStartMin] = useState(rangeStartMin);
  const [endMin, setEndMin] = useState(rangeEndMin);
  const [description, setDescription] = useState('');
  const [segments, setSegments] = useState<SegmentEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [pendingCategory, setPendingCategory] = useState('');

  const descInputRef = useRef<any>(null);

  useEffect(() => {
    const today = getTodayStr();
    fetchEvents(today, today).then((events) => {
      const existing = events
        .filter((e) => {
          const sm = timeToMin(e.startTime);
          return sm >= rangeStartMin && sm < rangeEndMin;
        })
        .map((e) => ({
          id: e.id,
          startMin: timeToMin(e.startTime),
          endMin: e.endTime ? timeToMin(e.endTime) : rangeEndMin,
          description: e.description,
          category: e.category || '',
          color: e.color || getColorForCategory(e.category || ''),
          status: e.status,
        }))
        .sort((a, b) => a.startMin - b.startMin);

      if (existing.length > 0) {
        setSegments(existing);
        const last = existing[existing.length - 1];
        if (last.status === 'completed') {
          setStartMin(Math.min(last.endMin, rangeEndMin));
        }
      }
    });
  }, []);

  useEffect(() => {
    if (window.electronAPI) {
      const baseHeight = 380;
      const extraHeight = segments.length * 52 + (description ? 40 : 0);
      window.electronAPI.setPopupHeight(baseHeight + extraHeight);
    }
  }, [segments.length, description]);

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const presets = getPresets(defaultHour);

  // 点击常用项：填入内容和分类
  const handlePresetClick = (item: PresetItem) => {
    setDescription(item.text);
    setPendingCategory(item.category);
    descInputRef.current?.focus();
  };

  const handleAddSegment = async () => {
    if (!description.trim()) {
      message.warning('请输入做了什么');
      return;
    }
    if (startMin >= endMin) {
      message.warning('结束时间必须晚于开始时间');
      return;
    }

    setSaving(true);

    const category = pendingCategory || description.trim();
    const color = getColorForCategory(category);

    const newSegment: SegmentEntry = {
      id: generateId(),
      startMin,
      endMin,
      description: description.trim(),
      category,
      color,
      status: 'completed',
    };

    const event: ScheduleEvent = {
      id: newSegment.id,
      date: getTodayStr(),
      startTime: minToTime(startMin),
      endTime: minToTime(endMin),
      description: newSegment.description,
      category: newSegment.category,
      color: newSegment.color,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    await saveEvent(event);

    const updated = [...segments, newSegment].sort((a, b) => a.startMin - b.startMin);
    setSegments(updated);

    setStartMin(endMin);
    setEndMin(rangeEndMin);
    setDescription('');
    setPendingCategory('');
    setSaving(false);
    descInputRef.current?.focus();
  };

  const handleInProgress = async () => {
    if (!description.trim()) {
      message.warning('请输入内容');
      return;
    }

    const category = pendingCategory || description.trim();
    const color = getColorForCategory(category);

    const newSegment: SegmentEntry = {
      id: generateId(),
      startMin,
      endMin: rangeEndMin,
      description: description.trim(),
      category,
      color,
      status: 'in_progress',
    };

    const event: ScheduleEvent = {
      id: newSegment.id,
      date: getTodayStr(),
      startTime: minToTime(startMin),
      endTime: null,
      description: newSegment.description,
      category: newSegment.category,
      color: newSegment.color,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
    };
    await saveEvent(event);

    setSegments([...segments, newSegment].sort((a, b) => a.startMin - b.startMin));
    setDescription('');
    setPendingCategory('');
    setStartMin(rangeEndMin);
    message.success('已标记为进行中');
  };

  const handleRemoveSegment = async (id: string) => {
    const { deleteEvent } = await import('../store/scheduleStore');
    await deleteEvent(id);
    setSegments(segments.filter((s) => s.id !== id));
  };

  // 自定义拖动时间条
  const trackWidth = 340;
  const totalRange = rangeEndMin - rangeStartMin;
  const toPixel = (min: number) => ((min - rangeStartMin) / totalRange) * trackWidth;
  const fromPixel = (px: number) => Math.round((px / trackWidth) * totalRange) + rangeStartMin;

  const startPx = toPixel(startMin);
  const endPx = toPixel(endMin);
  const isDragging = useRef<'start' | 'end' | null>(null);

  const handleTrackMouseDown = (type: 'start' | 'end') => (e: React.MouseEvent) => {
    e.stopPropagation();
    isDragging.current = type;
    const trackEl = (e.target as HTMLElement).closest('.time-track') as HTMLElement;
    const rect = trackEl.getBoundingClientRect();

    const onMove = (ev: MouseEvent) => {
      const px = Math.max(0, Math.min(trackWidth, ev.clientX - rect.left));
      const min = fromPixel(px);
      if (isDragging.current === 'start') {
        if (min < endMin - 5) setStartMin(min);
      } else {
        if (min > startMin + 5) setEndMin(min);
      }
    };
    const onUp = () => {
      isDragging.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleClose = () => {
    if (window.electronAPI) window.electronAPI.closePopup();
    else window.close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddSegment();
    }
  };

  const allFilled = startMin >= rangeEndMin;

  return (
    <div style={styles.wrapper}>
      <div style={styles.topBar}>
        <div style={styles.topLabel}>
          <ClockCircleOutlined style={{ marginRight: 6, color: '#aaa' }} />
          <span>{minToTime(rangeStartMin)} - {minToTime(rangeEndMin)}</span>
        </div>
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={handleClose} />
      </div>

      {/* 时间拖动条 */}
      <div style={styles.sliderSection}>
        <div style={styles.timeRange}>
          <span style={styles.timeValue}>{minToTime(startMin)}</span>
          <span style={styles.timeValue}>{minToTime(endMin)}</span>
        </div>

        <div className="time-track" style={styles.trackBg}>
          {segments.map((seg) => (
            <div
              key={seg.id}
              style={{
                position: 'absolute',
                left: toPixel(seg.startMin),
                width: toPixel(seg.endMin) - toPixel(seg.startMin),
                top: 0, height: 8, borderRadius: 3, zIndex: 1,
                background: seg.status === 'in_progress'
                  ? `repeating-linear-gradient(45deg, ${seg.color}, ${seg.color} 3px, ${seg.color}88 3px, ${seg.color}88 6px)`
                  : seg.color,
              }}
            />
          ))}

          <div style={{
            position: 'absolute', left: startPx, width: endPx - startPx,
            top: 0, height: 8, borderRadius: 3, zIndex: 2,
            background: pendingCategory ? getColorForCategory(pendingCategory) : '#1a1a1a',
          }} />

          <div style={{ ...styles.handle, left: startPx - 8 }} onMouseDown={handleTrackMouseDown('start')}>
            <div style={styles.handleDot} />
          </div>
          <div style={{ ...styles.handle, left: endPx - 8 }} onMouseDown={handleTrackMouseDown('end')}>
            <div style={styles.handleDot} />
          </div>
        </div>
      </div>

      {/* 常用项 */}
      <div style={styles.presetsSection}>
        <div style={styles.sectionLabel}>常用</div>
        <div style={styles.presetsRow}>
          {presets.map((item) => {
            const c = getColorForCategory(item.category);
            return (
              <Tag
                key={item.text}
                style={{
                  ...styles.presetTag,
                  borderColor: c,
                  color: '#555',
                }}
                onClick={() => handlePresetClick(item)}
              >
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: 2,
                  background: c, marginRight: 4, verticalAlign: 'middle',
                }} />
                {item.text}
              </Tag>
            );
          })}
        </div>
      </div>

      {/* 输入区 */}
      {!allFilled && (
        <div style={styles.inputSection}>
          <Input
            ref={descInputRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`${minToTime(startMin)}-${minToTime(endMin)} 做了什么…`}
            style={styles.descInput}
            size="small"
            prefix={
              pendingCategory ? (
                <span style={{
                  width: 10, height: 10, borderRadius: 2, display: 'inline-block',
                  background: getColorForCategory(pendingCategory), marginRight: 4,
                }} />
              ) : undefined
            }
          />
          <div style={styles.btnRow}>
            <Button size="small" type="default" onClick={handleAddSegment} loading={saving} icon={<PlusOutlined />}>
              添加这一段
            </Button>
            <Button size="small" type="dashed" onClick={handleInProgress}>进行中</Button>
          </div>
        </div>
      )}

      {allFilled && !segments.length && (
        <div style={styles.allDone}>本时段已全部记录</div>
      )}

      {/* 已记录 */}
      {segments.length > 0 && (
        <div style={styles.segmentsList}>
          <div style={styles.sectionLabel}>已记录</div>
          {segments.map((seg) => (
            <div key={seg.id} style={styles.segmentItem}>
              <span style={{
                width: 4, height: 16, borderRadius: 2, flexShrink: 0,
                background: seg.color,
              }} />
              <span style={styles.segmentTime}>
                {minToTime(seg.startMin)} - {seg.status === 'in_progress' ? '进行中' : minToTime(seg.endMin)}
              </span>
              <span style={styles.segmentDesc}>{seg.description}</span>
              <Button type="text" size="small" danger style={{ minWidth: 20, padding: 0 }}
                onClick={() => handleRemoveSegment(seg.id)}>
                <CloseOutlined style={{ fontSize: 10 }} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {allFilled && segments.length > 0 && (
        <div style={styles.footerBar}>
          <Button type="primary" size="small" block onClick={handleClose}>完成</Button>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: { padding: '12px 16px', height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 },
  topLabel: { fontSize: 13, color: '#888', display: 'flex', alignItems: 'center' },
  sliderSection: { flexShrink: 0, marginBottom: 14 },
  timeRange: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 },
  timeValue: { fontSize: 15, fontWeight: 600, color: '#2c2c2c', fontFamily: 'monospace' },
  trackBg: { position: 'relative', height: 24, background: '#f0f0f0', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center' },
  handle: {
    position: 'absolute', top: -4, width: 32, height: 32, borderRadius: 16,
    background: '#fff', border: '2px solid #2c2c2c', display: 'flex',
    alignItems: 'center', justifyContent: 'center', cursor: 'grab', zIndex: 3,
    boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
  },
  handleDot: { width: 6, height: 6, borderRadius: 3, background: '#2c2c2c' },
  presetsSection: { flexShrink: 0, marginBottom: 12 },
  sectionLabel: { fontSize: 11, color: '#bbb', marginBottom: 6, fontWeight: 500 },
  presetsRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  presetTag: {
    cursor: 'pointer', fontSize: 12, borderRadius: 4, padding: '1px 8px',
    background: '#fafafa', color: '#555', transition: 'all 0.15s',
    margin: 0, borderWidth: 1.5,
  },
  inputSection: { flexShrink: 0, marginBottom: 12 },
  descInput: { marginBottom: 8, borderRadius: 6 },
  btnRow: { display: 'flex', gap: 8 },
  segmentsList: { flex: 1, overflow: 'auto', borderTop: '1px solid #f2f2f2', paddingTop: 10 },
  segmentItem: {
    display: 'flex', alignItems: 'center', padding: '6px 0',
    borderBottom: '1px solid #fafafa', gap: 8,
  },
  segmentTime: { fontSize: 11, color: '#aaa', fontFamily: 'monospace', minWidth: 80, flexShrink: 0 },
  segmentDesc: { fontSize: 13, color: '#2c2c2c', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  allDone: { textAlign: 'center', color: '#bbb', fontSize: 13, padding: '20px 0' },
  footerBar: { flexShrink: 0, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f2f2f2' },
};

export default PopupForm;
