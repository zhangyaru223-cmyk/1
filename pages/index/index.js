
const EQUIPMENT = ['纹身床', '手臂架', '里屋'];

Page({
  data: {
    artistName: '',
    activeTab: 'calendar',
    bookings: [],
    currentDate: new Date(),
    selectedDate: new Date(),
    viewMonthStr: '',
    selectedDateStr: '',
    selectedDayName: '',
    daysInMonth: [],
    weeks: ['日', '一', '二', '三', '四', '五', '六'],
    equipList: EQUIPMENT,
    
    // 弹窗状态
    showModal: false,
    editingId: null,
    startTime: '14:00',
    endTime: '18:00',
    selectedEquips: [],
    notes: '',
    tempName: '',
    
    // 列表数据
    bookingsForSelectedDay: [],
    dailySummary: [],
    myBookings: []
  },

  onLoad() {
    const artistName = wx.getStorageSync('artist_name');
    const bookings = wx.getStorageSync('bookings') || [];
    this.setData({ artistName, bookings });
    this.updateCalendar();
  },

  onShow() {
    this.refreshData();
  },

  // --- 逻辑处理 ---
  
  refreshData() {
    const { bookings, selectedDate, artistName } = this.data;
    const dateStr = this.formatDate(selectedDate);
    
    const dayBookings = bookings
      .filter(b => b.date === dateStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    const myHistory = bookings
      .filter(b => b.artistName === artistName)
      .sort((a, b) => b.date.localeCompare(a.date));

    // 计算冲突
    let summary = [];
    if (dayBookings.length > 0) {
      summary.push({ text: `📅 今日共 ${dayBookings.length} 条预约`, isWarning: false });
      
      // 冲突检查
      for (let i = 0; i < dayBookings.length; i++) {
        for (let j = i + 1; j < dayBookings.length; j++) {
          const b1 = dayBookings[i];
          const b2 = dayBookings[j];
          const overlap = b1.startTime < b2.endTime && b2.startTime < b1.endTime;
          const common = b1.equipments.filter(e => b2.equipments.includes(e));
          if (overlap && common.length > 0) {
            summary.unshift({ text: `⚠️ 器材冲突: ${b1.artistName} & ${b2.artistName}`, isWarning: true });
          }
        }
      }
    } else {
      summary.push({ text: "今日暂无安排", isWarning: false });
    }

    this.setData({
      bookingsForSelectedDay: dayBookings,
      myBookings: myHistory,
      dailySummary: summary,
      selectedDateStr: `${selectedDate.getMonth() + 1}.${selectedDate.getDate()}`,
      selectedDayName: ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][selectedDate.getDay()]
    });
  },

  updateCalendar() {
    const { currentDate, selectedDate, bookings } = this.data;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevLastDate = new Date(year, month, 0).getDate();
    
    let days = [];
    
    // 上月尾部
    for (let i = firstDay; i > 0; i--) {
      days.push({ day: prevLastDate - i + 1, isCurrentMonth: false, date: this.formatDate(new Date(year, month - 1, prevLastDate - i + 1)) });
    }
    // 本月
    for (let i = 1; i <= lastDate; i++) {
      const d = new Date(year, month, i);
      const dStr = this.formatDate(d);
      days.push({ 
        day: i, 
        isCurrentMonth: true, 
        date: dStr,
        isSelected: dStr === this.formatDate(selectedDate),
        hasBooking: bookings.some(b => b.date === dStr)
      });
    }
    // 下月头部
    const nextFill = 42 - days.length;
    for (let i = 1; i <= nextFill; i++) {
      days.push({ day: i, isCurrentMonth: false, date: this.formatDate(new Date(year, month + 1, i)) });
    }

    this.setData({
      daysInMonth: days,
      viewMonthStr: `${year} / ${String(month + 1).padStart(2, '0')}`
    });
    this.refreshData();
  },

  // --- 交互事件 ---

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  selectDate(e) {
    const dateStr = e.currentTarget.dataset.date;
    const parts = dateStr.split('-');
    const newDate = new Date(parts[0], parts[1]-1, parts[2]);
    this.setData({ selectedDate: newDate }, () => this.updateCalendar());
  },

  prevMonth() {
    const d = this.data.currentDate;
    this.setData({ currentDate: new Date(d.getFullYear(), d.getMonth() - 1, 1) }, () => this.updateCalendar());
  },

  nextMonth() {
    const d = this.data.currentDate;
    this.setData({ currentDate: new Date(d.getFullYear(), d.getMonth() + 1, 1) }, () => this.updateCalendar());
  },

  showAddModal() {
    this.setData({ 
      showModal: true, 
      editingId: null,
      startTime: '14:00',
      endTime: '18:00',
      selectedEquips: [],
      notes: ''
    });
  },

  closeModal() { this.setData({ showModal: false }); },

  toggleEquip(e) {
    const val = e.currentTarget.dataset.val;
    let list = this.data.selectedEquips;
    if (list.includes(val)) list = list.filter(x => x !== val);
    else list.push(val);
    this.setData({ selectedEquips: list });
  },

  saveBooking() {
    const { artistName, selectedDate, startTime, endTime, selectedEquips, notes, bookings, editingId } = this.data;
    if (selectedEquips.length === 0) return wx.showToast({ title: '请选择器材', icon: 'none' });

    let newBookings = [...bookings];
    const dateStr = this.formatDate(selectedDate);

    if (editingId) {
      newBookings = newBookings.map(b => b.id === editingId ? { ...b, startTime, endTime, equipments: selectedEquips, notes } : b);
    } else {
      newBookings.push({
        id: Math.random().toString(36).substr(2, 9),
        artistName,
        date: dateStr,
        startTime,
        endTime,
        equipments: selectedEquips,
        notes
      });
    }

    wx.setStorageSync('bookings', newBookings);
    this.setData({ bookings: newBookings, showModal: false });
    this.updateCalendar();
    wx.showToast({ title: '已保存' });
  },

  editBooking(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.bookings.find(b => b.id === id);
    if (item) {
      this.setData({
        showModal: true,
        editingId: id,
        startTime: item.startTime,
        endTime: item.endTime,
        selectedEquips: item.equipments,
        notes: item.notes || ''
      });
    }
  },

  deleteBooking(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除预约',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          const newB = this.data.bookings.filter(b => b.id !== id);
          wx.setStorageSync('bookings', newB);
          this.setData({ bookings: newB });
          this.updateCalendar();
        }
      }
    });
  },

  // --- 其他 ---

  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  bindNameInput(e) { this.setData({ tempName: e.detail.value }); },
  login() {
    if (this.data.tempName) {
      wx.setStorageSync('artist_name', this.data.tempName);
      this.setData({ artistName: this.data.tempName });
    }
  },

  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定退出系统？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          this.setData({ artistName: '' });
        }
      }
    });
  },

  bindStartTimeChange(e) { this.setData({ startTime: e.detail.value }); },
  bindEndTimeChange(e) { this.setData({ endTime: e.detail.value }); },
  bindNotesInput(e) { this.setData({ notes: e.detail.value }); },

  exportData() {
    wx.setClipboardData({
      data: JSON.stringify(this.data.bookings),
      success: () => wx.showModal({ title: '导出成功', content: '数据已复制到剪贴板，请发给同事粘贴到导入框。', showCancel: false })
    });
  },

  importData() {
    wx.showModal({
      title: '导入数据',
      editable: true,
      placeholderText: '请粘贴同事发给你的代码...',
      success: (res) => {
        if (res.confirm && res.content) {
          try {
            const list = JSON.parse(res.content);
            wx.setStorageSync('bookings', list);
            this.setData({ bookings: list });
            this.updateCalendar();
            wx.showToast({ title: '导入成功' });
          } catch(e) {
            wx.showToast({ title: '数据格式有误', icon: 'none' });
          }
        }
      }
    });
  }
});
