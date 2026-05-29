<template>
	<transition name="popup-fade">
		<div
			v-if="show && prize"
			class="popup-overlay"
			role="dialog"
			aria-modal="true"
			:aria-label="prize.name"
			@click.self="$emit('close')"
		>
			<!-- Canvas pháo hoa – chỉ hiện khi thắng -->
			<canvas v-if="isLucky" ref="confettiCanvas" class="confetti-canvas"></canvas>

			<div class="popup-box" :class="{ 'is-lucky': isLucky }">

				<!-- Banner top -->
				<div class="popup-top">
					<img src="/img/bannerpopup.png" alt="Con Cưng – Vòng quay may mắn">
					<button class="popup-close-x" @click="$emit('close')" aria-label="Đóng">
						x
					</button>
				</div>

				<div class="popup-content">

					<!-- Thắng giải -->
					<template v-if="isLucky">
						<div class="popup-image" v-if="prize.image">
							<img :src="prize.image" :alt="prize.name">
						</div>
						<div class="popup-icon" v-else>🎁</div>

						<div class="popup-title">Ba mẹ nhận được</div>
						<div class="popup-prize">{{ prize.name }}</div>

						<p v-if="prize.description" class="popup-description">
							{{ prize.description }}
						</p>

						<div class="popup-note">
							Ba mẹ vui lòng chụp ảnh lại gửi cho quản lý để được xác nhận hoàn thành nhé!
						</div>
					</template>

					<!-- Thua -->
					<template v-else>
						<div class="popup-unlucky-icon">😔</div>
						<div class="popup-title">Chưa trúng lần này</div>
						<div class="popup-prize-muted">Chúc bạn may mắn lần sau!</div>
						<p class="popup-description">
							Cảm ơn ba mẹ đã tham gia. Hẹn gặp lại trong chương trình tiếp theo nhé!
						</p>
					</template>

					<button
						class="popup-btn"
						:class="{ 'btn-muted': !isLucky }"
						@click="$emit('close')"
					>
						{{ isLucky ? 'Tuyệt vời!' : 'Đóng' }}
					</button>

				</div>
			</div>
		</div>
	</transition>
</template>

<script setup>
import { computed, watch, ref, nextTick, onUnmounted } from 'vue'

const props = defineProps({
	show: { type: Boolean, default: false },
	prize: { type: Object, default: null }
})

const emit = defineEmits(['close'])

const confettiCanvas = ref(null)
let confettiAnim = null
let particles = []

const isLucky = computed(() =>
	props.prize && !props.prize.name.includes('may mắn lần sau')
)

// ─── Pháo hoa ──────────────────────────────────────────────────────────────
const COLORS = [
	'#ff5ea3', '#f11f7b', '#ffcc00', '#00d2ff',
	'#a259ff', '#ff6b35', '#00e676', '#ff4081',
	'#ffffff', '#ffe082'
]

const randomBetween = (a, b) => a + Math.random() * (b - a)

const createParticle = (canvasW) => ({
	x: randomBetween(0, canvasW),
	y: randomBetween(-80, -10),
	r: randomBetween(4, 9),
	color: COLORS[Math.floor(Math.random() * COLORS.length)],
	speedY: randomBetween(2.5, 5.5),
	speedX: randomBetween(-1.8, 1.8),
	rotation: randomBetween(0, 360),
	rotationSpeed: randomBetween(-4, 4),
	opacity: 1,
	shape: Math.random() > 0.5 ? 'rect' : 'circle',
	scaleX: randomBetween(0.4, 1),
})

const drawParticle = (ctx, p) => {
	ctx.save()
	ctx.globalAlpha = p.opacity
	ctx.fillStyle = p.color
	ctx.translate(p.x, p.y)
	ctx.rotate((p.rotation * Math.PI) / 180)
	ctx.scale(p.scaleX, 1)
	if (p.shape === 'rect') {
		ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r)
	} else {
		ctx.beginPath()
		ctx.arc(0, 0, p.r, 0, Math.PI * 2)
		ctx.fill()
	}
	ctx.restore()
}

const startConfetti = async () => {
	await nextTick()
	const canvas = confettiCanvas.value
	if (!canvas) return

	const W = window.innerWidth
	const H = window.innerHeight
	canvas.width  = W
	canvas.height = H

	particles = Array.from({ length: 120 }, () => createParticle(W))
	const ctx = canvas.getContext('2d')

	const tick = () => {
		ctx.clearRect(0, 0, W, H)

		particles.forEach(p => {
			p.y += p.speedY
			p.x += p.speedX
			p.rotation += p.rotationSpeed
			// Fade out khi gần cuối màn hình
			if (p.y > H * 0.75) {
				p.opacity -= 0.025
			}
			drawParticle(ctx, p)
		})

		// Loại bỏ hạt đã mờ, thêm hạt mới nếu còn < 80 và chưa quá 3s
		particles = particles.filter(p => p.opacity > 0)

		if (particles.length < 80) {
			for (let i = 0; i < 6; i++) particles.push(createParticle(W))
		}

		confettiAnim = requestAnimationFrame(tick)
	}

	confettiAnim = requestAnimationFrame(tick)

	// Dừng spawn sau 3.5s, để hạt rơi hết rồi xóa canvas
	setTimeout(() => {
		cancelAnimationFrame(confettiAnim)
		confettiAnim = null

		const fadeOut = () => {
			particles = particles.filter(p => p.opacity > 0)

			// Hết hạt → xóa canvas khỏi DOM
			if (particles.length === 0) {
				ctx.clearRect(0, 0, W, H)
				confettiAnim = null
				return
			}

			particles.forEach(p => {
				p.y += p.speedY
				p.x += p.speedX
				p.rotation += p.rotationSpeed
				p.opacity -= 0.018
			})

			ctx.clearRect(0, 0, W, H)
			particles.forEach(p => drawParticle(ctx, p))
			confettiAnim = requestAnimationFrame(fadeOut)
		}

		confettiAnim = requestAnimationFrame(fadeOut)
	}, 3500)
}

const stopConfetti = () => {
	if (confettiAnim) {
		cancelAnimationFrame(confettiAnim)
		confettiAnim = null
	}
	particles = []
}

// Khi popup mở → chạy pháo hoa nếu thắng
watch(() => props.show, (val) => {
	document.body.style.overflow = val ? 'hidden' : ''
	if (val && isLucky.value) {
		startConfetti()
	} else {
		stopConfetti()
	}
})

// Đóng bằng Escape
const handleEsc = (e) => { if (e.key === 'Escape') emit('close') }
window.addEventListener('keydown', handleEsc)

onUnmounted(() => {
	window.removeEventListener('keydown', handleEsc)
	document.body.style.overflow = ''
	stopConfetti()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700;800;900&display=swap');

/* ─── Overlay ──────────────────────────────────────────────────────────────── */
.popup-overlay {
	position: fixed;
	inset: 0;
	z-index: 9999;
	background: rgba(0, 0, 0, 0.5);
	-webkit-backdrop-filter: blur(6px);
	backdrop-filter: blur(6px);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px;
	font-family: 'Be Vietnam Pro', Arial, sans-serif;
}

/* ─── Canvas pháo hoa ──────────────────────────────────────────────────────── */
.confetti-canvas {
	position: fixed;
	inset: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
	z-index: 10000;
}

/* ─── Box ──────────────────────────────────────────────────────────────────── */
.popup-box {
	width: 100%;
	max-width: 380px;
	background: #fff;
	border-radius: 24px;
	overflow: hidden;
	box-shadow:
		0 24px 60px rgba(0, 0, 0, 0.22),
		0 4px 16px rgba(0, 0, 0, 0.1);
	animation: popupBounce 0.44s cubic-bezier(0.34, 1.56, 0.64, 1);
	position: relative;
	z-index: 10001;
	/* Gradient liền mạch từ banner xuống content */
	background: linear-gradient(180deg, #f9c3f0 0%, #fce8f6 33%, #ffe7f7 50%, #fff8fc 55%, #ffffff 75%);
}

/* ─── Banner top ───────────────────────────────────────────────────────────── */
.popup-top {
	position: relative;
	width: 100%;
	height: 140px;
	background: transparent;
	line-height: 0;
	overflow: hidden;
}

.popup-top img {
	width: 100%;
	height: 100%;
	display: block;
	object-fit: cover;
	object-position: center;
}

.popup-close-x {
	position: absolute;
	top: 10px;
	right: 10px;
	width: 32px;
	height: 32px;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.85);
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #555;
	cursor: pointer;
	touch-action: manipulation;
	transition: background 0.15s, transform 0.12s;
	z-index: 2;
}

.popup-close-x:hover  { background: #fff; transform: scale(1.08); }
.popup-close-x:active { transform: scale(0.94); }

/* ─── Content ──────────────────────────────────────────────────────────────── */
.popup-content {
	padding: 20px 24px 24px;
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;
	background: transparent;
}

.popup-image {
	width: 100%;
	height: 160px;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 12px;
}

.popup-image img {
	max-width: 220px;
	max-height: 375px;
	width: auto;
	height: auto;
	object-fit: contain;
	display: block;
	margin: 75px 0 0 0;
}

.popup-icon {
	height: 120px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 68px;
	margin-bottom: 12px;
}

.popup-unlucky-icon {
	height: 100px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 62px;
	margin-bottom: 8px;
	opacity: 0.75;
}

.popup-title {
	font-size: 15px;
	font-weight: 600;
	color: #888;
	margin-bottom: 4px;
	letter-spacing: 0.1px;
}

.popup-prize {
	font-size: 26px;
	font-weight: 900;
	color: #e53185;
	line-height: 1.2;
	margin-bottom: 6px;
}

.popup-prize-muted {
	font-size: 20px;
	font-weight: 800;
	color: #bbb;
	line-height: 1.3;
	margin-bottom: 8px;
}

.popup-description {
	font-size: 13.5px;
	color: #666;
	line-height: 1.55;
	margin: 4px 0 0;
	max-width: 300px;
}

.popup-note {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	max-width: 310px;
	margin: 16px auto 0;
	padding: 12px 14px;
	background: #fff5fb;
	border-radius: 12px;
	border: 1px solid #fcc8e2;
	font-size: 12.5px;
	line-height: 1.55;
	color: #c0356e;
	text-align: left;
}

.popup-note svg { flex-shrink: 0; margin-top: 1px; }

/* ─── Nút ──────────────────────────────────────────────────────────────────── */
.popup-btn {
	margin-top: 20px;
	width: 100%;
	height: 48px;
	border: none;
	border-radius: 14px;
	background: linear-gradient(180deg, #ff5ea3, #f11f7b);
	color: #fff;
	font-family: 'Be Vietnam Pro', Arial, sans-serif;
	font-size: 16px;
	font-weight: 800;
	cursor: pointer;
	touch-action: manipulation;
	box-shadow: 0 8px 22px rgba(241, 31, 123, 0.28);
	transition: transform 0.15s ease, box-shadow 0.15s ease;
	letter-spacing: 0.3px;
}

.popup-btn:hover  { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(241, 31, 123, 0.36); }
.popup-btn:active { transform: translateY(1px) scale(0.98); box-shadow: 0 4px 12px rgba(241, 31, 123, 0.2); }

.popup-btn.btn-muted {
	background: linear-gradient(180deg, #bbb, #999);
	box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}
.popup-btn.btn-muted:hover { box-shadow: 0 10px 22px rgba(0, 0, 0, 0.18); }

/* ─── Transition ───────────────────────────────────────────────────────────── */
.popup-fade-enter-active,
.popup-fade-leave-active { transition: opacity 0.25s ease; }
.popup-fade-enter-from,
.popup-fade-leave-to     { opacity: 0; }

/* ─── Bounce ───────────────────────────────────────────────────────────────── */
@keyframes popupBounce {
	0%   { opacity: 0; transform: scale(0.78) translateY(16px); }
	70%  { transform: scale(1.03) translateY(0); }
	100% { opacity: 1; transform: scale(1); }
}

/* ─── Responsive ───────────────────────────────────────────────────────────── */
@media (max-width: 390px) {
	.popup-box     { border-radius: 20px; }
	.popup-top     { height: 120px; }
	.popup-content { padding: 16px 18px 20px; }
	.popup-image   { height: 130px; }
	.popup-image img { max-width: 190px; max-height: 120px; }
	.popup-prize   { font-size: 23px; }
	.popup-btn     { height: 46px; font-size: 15px; }
}
</style>