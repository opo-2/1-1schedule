import React, { useState, useEffect, useCallback } from 'react';
import { Button, Modal, Input, TimePicker, Select, Popconfirm, message, ColorPicker } from 'antd';
import { LeftOutlined, RightOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { ScheduleEvent, MORANDI_COLORS, getColorForCategory } from '../types';
import { fetchEvents, saveEvent, deleteEvent, generateId } from '../store/scheduleStore';
import { getWeekRange, getWeekDays, timeToMin, minToTime, ALL_CATEGORIES } from '../store/utils';

dayjs.extend(isoWeek);

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const WeekView: React.FC = () => {
  const [currentMonday, setCurrentMonday] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return dayjs(new Date(d.setDate(diff))).format('YYYY-MM-DD');
  });

  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<ScheduleEvent>>({});
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStartTime, setSelectedStartTime] = useState('08:00');

  const weekRange = getWeekRange(new Date(currentMonday));
  const weekDays = getWeekDays(currentMonday);

  const loadEvents = useCallback(async () => {
    const data = await fetchEvents(weekRange.start, weekRange.end);
    setEvents(data);
  }, [weekRange.start, weekRange.end]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const prevWeek = () => setCurrentMonday(dayjs(currentMonday).subtract(7, 'day').format('YYYY-MM-DD'));
  const nextWeek = () => setCurrentMonday(dayjs(currentMonday).add(7, 'day').format('YYYY-MM-DD'));
  const thisWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentMonday(dayjs(new Date(d.setDate(diff))).format('YYYY-MM-DD'));
  };

  const handleCellClick = (date: string, hour: number) => {
    setSelectedDate(date);
    setSelectedStartTime(minToTime(hour * 60));
    setEditingEvent({});
    setModalOpen(true);
  };

  const handleEventClick = (evt: ScheduleEvent) => {
    setSelectedDate(evt.date);
    setEditingEvent(evt);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingEvent.description?.trim()) {
      message.warning('请输入内容');
      return;
    }
    if (!editingEvent.startTime) {
      message.warning('请选择开始时间');
      return;
    }

    const category = editingEvent.category || editingEvent.description?.trim() || '其他';
    const color = editingEvent.color || getColorForCategory(category);

    const event: ScheduleEvent = {
      id: editingEvent.id || generateId(),
      date: selectedDate || editingEvent.date || '',
      startTime: editingEvent.startTime || '08:00',
      endTime: editingEvent.endTime || null,
      description: editingEvent.description || '',
      category,
      color,
      status: editingEvent.status || 'completed',
      createdAt: editingEvent.createdAt || new Date().toISOString(),
    };

    await saveEvent(event);
    setModalOpen(false);
    setEditingEvent({});
    loadEvents();
  };

  const handleDelete = async () => {
    if (editingEvent.id) {
      await deleteEvent(editingEvent.id);
      setModalOpen(false);
      setEditingEvent({});
      loadEvents();
    }
  };

  // 计算日程块样式
  const getEventStyle = (evt: ScheduleEvent) => {
    const startMin = timeToMin(evt.startTime);
    const endMin = evt.endTime ? timeToMin(evt.endTime) : startMin + 30;
    const top = (startMin / 1440) * 100;
    const height = Math.max(((endMin - startMin) / 1440) * 100, 1.2);

    const bgColor = evt.color || getColorForCategory(evt.category || '');

    return {
      top: `${top}%`,
      height: `${height}%`,
      background: evt.status === 'in_progress'
        ? `repeating-linear-gradient(135deg, ${bgColor} 0px, ${bgColor} 4px, ${bgColor}88 4px, ${bgColor}88 8px)`
        : bgColor,
      borderLeft: `3px solid ${bgColor}`,
    };
  };

  const timeLabels = HOURS.map((h) => `${String(h).padStart(2, '0')}:00`);

  // 判断深色/浅色以决定文字颜色
  const textColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) > 170 ? '#1a1a1a' : '#fff';
  };

  // 图例：当前周中所有用到的分类
  const usedCategories = [...new Set(events.map((e) => e.category).filter(Boolean))];

  return (
    <div style={styles.container}>
      {/* 顶栏 */}
      <div style={styles.header}>
        <h1 style={styles.title}>日程管理</h1>
        <div style={styles.headerRight}>
          <Button icon={<LeftOutlined />} onClick={prevWeek} type="text" />
          <Button type="link" onClick={thisWeek} style={{ fontWeight: 500 }}>
            {currentMonday} 周
          </Button>
          <Button icon={<RightOutlined />} onClick={nextWeek} type="text" />
        </div>
      </div>

      {/* 图例 */}
      {usedCategories.length > 0 && (
        <div style={styles.legendBar}>
          {usedCategories.map((cat) => {
            const c = events.find((e) => e.category === cat)?.color || getColorForCategory(cat);
            return (
              <span key={cat} style={styles.legendItem}>
                <span style={{ ...styles.legendDot, background: c }} />
                {cat}
              </span>
            );
          })}
        </div>
      )}

      {/* 周视图 */}
      <div style={styles.table}>
        <div style={styles.headerRow}>
          <div style={styles.timeGutter} />
          {weekDays.map((day) => (
            <div key={day.date} style={styles.dayHeader}>
              <div style={styles.dayName}>{day.label}</div>
              <div style={styles.dayDate}>{day.md}</div>
            </div>
          ))}
        </div>

        <div style={styles.body}>
          <div style={styles.timeColumn}>
            {timeLabels.map((t) => (
              <div key={t} style={styles.timeLabel}>{t}</div>
            ))}
          </div>

          {weekDays.map((day) => (
            <div key={day.date} style={styles.dayColumn}>
              {Array.from({ length: 48 }, (_, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.hourCell,
                    borderBottom: i % 2 === 0 ? '1px solid #e8e8e8' : '1px solid #f2f2f2',
                  }}
                  onClick={() => handleCellClick(day.date, Math.floor(i / 2))}
                />
              ))}

              {events
                .filter((evt) => evt.date === day.date)
                .map((evt) => {
                  const bg = evt.color || getColorForCategory(evt.category || '');
                  return (
                    <div
                      key={evt.id}
                      style={{
                        ...styles.eventBlock,
                        ...getEventStyle(evt),
                        color: textColor(bg),
                      }}
                      onClick={(e) => { e.stopPropagation(); handleEventClick(evt); }}
                      title={`${evt.startTime}${evt.endTime ? `-${evt.endTime}` : ' 进行中'}  ${evt.description}`}
                    >
                      <span style={styles.eventTime}>
                        {evt.startTime}{evt.endTime ? `-${evt.endTime}` : ''}
                      </span>
                      <span style={styles.eventDesc}>{evt.description}</span>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      {/* 编辑弹窗 */}
      <Modal
        title={editingEvent.id ? '编辑日程' : '添加日程'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); setEditingEvent({}); }}
        okText="保存"
        cancelText="取消"
        width={440}
        footer={[
          editingEvent.id && (
            <Popconfirm key="del" title="确定删除？" onConfirm={handleDelete} okText="删除" cancelText="取消">
              <Button danger icon={<DeleteOutlined />} style={{ float: 'left' }}>删除</Button>
            </Popconfirm>
          ),
          <Button key="cancel" onClick={() => { setModalOpen(false); setEditingEvent({}); }}>取消</Button>,
          <Button key="save" type="primary" onClick={handleSave}>保存</Button>,
        ]}
      >
        <div style={styles.formItem}>
          <label style={styles.formLabel}>日期</label>
          <span style={styles.formValue}>{selectedDate || editingEvent.date}</span>
        </div>

        <div style={styles.formRow}>
          <div style={{ flex: 1 }}>
            <label style={styles.formLabel}>开始</label>
            <TimePicker
              format="HH:mm"
              minuteStep={15}
              style={{ width: '100%' }}
              value={
                (editingEvent.startTime || selectedStartTime)
                  ? dayjs(`2024-01-01 ${editingEvent.startTime || selectedStartTime}`)
                  : undefined
              }
              onChange={(time) => {
                if (time) setEditingEvent({ ...editingEvent, startTime: time.format('HH:mm') });
              }}
            />
          </div>
          <div style={{ flex: 1, marginLeft: 12 }}>
            <label style={styles.formLabel}>结束</label>
            <TimePicker
              format="HH:mm"
              minuteStep={15}
              style={{ width: '100%' }}
              placeholder="进行中"
              value={
                editingEvent.endTime
                  ? dayjs(`2024-01-01 ${editingEvent.endTime}`)
                  : undefined
              }
              onChange={(time) => {
                if (time) setEditingEvent({ ...editingEvent, endTime: time.format('HH:mm'), status: 'completed' });
              }}
            />
          </div>
        </div>

        <div style={styles.formItem}>
          <label style={styles.formLabel}>内容</label>
          <Input
            value={editingEvent.description || ''}
            onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
            placeholder="做了什么"
          />
        </div>

        <div style={styles.formRow}>
          <div style={{ flex: 1 }}>
            <label style={styles.formLabel}>分类（决定颜色）</label>
            <Select
              style={{ width: '100%' }}
              value={editingEvent.category || undefined}
              onChange={(val) => setEditingEvent({ ...editingEvent, category: val })}
              placeholder="选择分类"
              allowClear
              options={ALL_CATEGORIES.map((c) => ({
                value: c,
                label: (
                  <span>
                    <span style={{
                      display: 'inline-block', width: 12, height: 12, borderRadius: 3,
                      background: editingEvent.color || getColorForCategory(c),
                      marginRight: 8, verticalAlign: 'middle',
                    }} />
                    {c}
                  </span>
                ),
              }))}
            />
          </div>
          <div style={{ flex: 1, marginLeft: 12 }}>
            <label style={styles.formLabel}>颜色（自定义）</label>
            <ColorPicker
              value={editingEvent.color || (editingEvent.category ? getColorForCategory(editingEvent.category) : MORANDI_COLORS[0])}
              onChange={(_, hex) => setEditingEvent({ ...editingEvent, color: hex })}
              presets={[
                { label: '莫兰迪', colors: MORANDI_COLORS },
              ]}
            >
              <div style={{
                width: '100%', height: 32, borderRadius: 6, cursor: 'pointer',
                background: editingEvent.color || (editingEvent.category ? getColorForCategory(editingEvent.category) : MORANDI_COLORS[0]),
                border: '1px solid #d9d9d9',
              }} />
            </ColorPicker>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8f8f6',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 20px', background: '#fff', borderBottom: '1px solid #e8e8e8', flexShrink: 0,
  },
  title: { fontSize: 18, fontWeight: 600, color: '#2c2c2c', margin: 0 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 4 },
  legendBar: {
    display: 'flex', gap: 16, padding: '6px 20px', background: '#fff',
    borderBottom: '1px solid #eee', flexShrink: 0, flexWrap: 'wrap',
  },
  legendItem: { fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 3, display: 'inline-block' },
  table: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  headerRow: { display: 'flex', flexShrink: 0, borderBottom: '2px solid #ddd', background: '#fff' },
  timeGutter: { width: 56, flexShrink: 0 },
  dayHeader: { flex: 1, textAlign: 'center', padding: '8px 4px', borderLeft: '1px solid #eee' },
  dayName: { fontSize: 13, color: '#777', fontWeight: 500 },
  dayDate: { fontSize: 11, color: '#aaa', marginTop: 2 },
  body: { flex: 1, display: 'flex', overflow: 'auto' },
  timeColumn: { width: 56, flexShrink: 0, background: '#fff', borderRight: '1px solid #eee' },
  timeLabel: { height: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', fontSize: 11, color: '#bbb', paddingTop: 2 },
  dayColumn: { flex: 1, position: 'relative', borderLeft: '1px solid #eee', background: '#fff' },
  hourCell: { height: 30, cursor: 'pointer' },
  eventBlock: {
    position: 'absolute', left: 1, right: 1, borderRadius: 4,
    padding: '2px 5px', fontSize: 11, cursor: 'pointer',
    overflow: 'hidden', zIndex: 2, transition: 'opacity 0.15s',
    opacity: 0.92,
  },
  eventTime: { display: 'block', fontSize: 10, opacity: 0.7, lineHeight: 1.2 },
  eventDesc: { display: 'block', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 },
  formItem: { marginBottom: 14 },
  formLabel: { display: 'block', marginBottom: 4, fontSize: 12, color: '#888', fontWeight: 500 },
  formValue: { fontSize: 14, color: '#2c2c2c' },
  formRow: { display: 'flex', marginBottom: 14 },
};

export default WeekView;
