---
name: nano-banana
description: Stable Diffusion 2 helper skill. Use when the user wants to generate images from text, modify existing images, run depth-conditional generation, inpainting, or upscaling with Stable Diffusion 2 scripts.
---

# Nano Banana – Stable Diffusion 2 Helper

Help users run Stable Diffusion 2 inference scripts correctly, choose the right config and parameters, and interpret results.

## Repository Layout

```
scripts/
  txt2img.py          # Text-to-image generation
  img2img.py          # Image-to-image modification
  gradio/
    depth2img.py      # Depth-conditional generation (web UI)
    inpainting.py     # Inpainting (web UI)
    superresolution.py# x4 upscaling (web UI)
  streamlit/          # Streamlit variants of the same UIs

configs/stable-diffusion/
  v2-inference.yaml         # 512×512 base model (noise-prediction)
  v2-inference-v.yaml       # 768×768 v-prediction model
  v2-midas-inference.yaml   # Depth-conditional (structure-preserving img2img)
  v2-inpainting-inference.yaml # Inpainting fine-tuned model
  x4-upscaling.yaml         # Latent diffusion x4 upscaler

  intel/                    # CPU-optimised variants
    v2-inference-fp32.yaml
    v2-inference-v-fp32.yaml
    v2-inference-bf16.yaml
    v2-inference-v-bf16.yaml
```

## Workflow

Make a todo list for the steps below and work through them one at a time.

### 1. Identify the Task

Ask/determine what the user wants to do:

| Goal | Script |
|---|---|
| Generate image from text prompt | `scripts/txt2img.py` |
| Modify / restyle an existing image | `scripts/img2img.py` |
| Preserve structure, change style | `scripts/gradio/depth2img.py` |
| Fill in masked regions of an image | `scripts/gradio/inpainting.py` |
| Upscale image 4× | `scripts/gradio/superresolution.py` |

### 2. Check Prerequisites

- **Checkpoint path** – the user must provide `--ckpt <path>`. Confirm the file exists.
- **Device** – default is CPU (`--device cpu`). If CUDA is available, use `--device cuda` for speed.
- **Python environment** – ensure dependencies are installed: `pip install -r requirements.txt` or activate the conda env (`conda env create -f environment.yaml && conda activate ldm`).

### 3. Select Config

Match the config to the checkpoint type:

| Config | Use When |
|---|---|
| `configs/stable-diffusion/v2-inference.yaml` | 512×512 base model |
| `configs/stable-diffusion/v2-inference-v.yaml` | 768×768 v-prediction model (recommended for `--H 768 --W 768`) |
| `configs/stable-diffusion/v2-midas-inference.yaml` | Depth-conditional img2img (requires MiDaS weights in `midas_models/`) |
| `configs/stable-diffusion/v2-inpainting-inference.yaml` | Inpainting model |
| `configs/stable-diffusion/x4-upscaling.yaml` | x4 upscaling model |
| `configs/stable-diffusion/intel/v2-inference-bf16.yaml` | CPU inference with BFloat16 precision |

### 4. Build the Command

**Text-to-Image (512px base model):**
```bash
python scripts/txt2img.py \
  --prompt "your prompt here" \
  --ckpt <path/to/model.ckpt> \
  --config configs/stable-diffusion/v2-inference.yaml \
  --device cuda \
  --seed 42
```

**Text-to-Image (768px v-prediction model):**
```bash
python scripts/txt2img.py \
  --prompt "your prompt here" \
  --ckpt <path/to/768model.ckpt> \
  --config configs/stable-diffusion/v2-inference-v.yaml \
  --H 768 --W 768 \
  --device cuda \
  --seed 42
```

**Image-to-Image:**
```bash
python scripts/img2img.py \
  --prompt "a fantasy landscape" \
  --init-img <path/to/input.jpg> \
  --strength 0.8 \
  --ckpt <path/to/model.ckpt> \
  --config configs/stable-diffusion/v2-inference.yaml \
  --device cuda
```

**Depth-Conditional (Web UI):**
```bash
python scripts/gradio/depth2img.py \
  configs/stable-diffusion/v2-midas-inference.yaml \
  <path/to/depth-model.ckpt>
```
> Requires MiDaS `dpt_hybrid` weights in `midas_models/` folder.

**Inpainting (Web UI):**
```bash
python scripts/gradio/inpainting.py \
  configs/stable-diffusion/v2-inpainting-inference.yaml \
  <path/to/inpainting-model.ckpt>
```

**Upscaling (Web UI):**
```bash
python scripts/gradio/superresolution.py \
  configs/stable-diffusion/x4-upscaling.yaml \
  <path/to/upscaling-model.ckpt>
```

**Intel CPU (BFloat16):**
```bash
python scripts/txt2img.py \
  --prompt "your prompt here" \
  --ckpt <path/to/model.ckpt> \
  --config configs/stable-diffusion/intel/v2-inference-bf16.yaml \
  --device cpu --ipex --bf16
```

### 5. Key Parameters Explained

| Parameter | Default | Meaning |
|---|---|---|
| `--steps` | 50 | DDIM sampling steps. More = higher quality but slower. 20–50 is typical. |
| `--scale` | 9.0 | Classifier-free guidance scale. Higher = more prompt adherence, less diversity. |
| `--seed` | 42 | Random seed for reproducibility. Change to get different results. |
| `--ddim_eta` | 0.0 | 0.0 = deterministic (DDIM). 1.0 = stochastic (DDPM-like). |
| `--n_samples` | 3 | Batch size – images generated per iteration. |
| `--n_iter` | 3 | Number of iterations (total images = n_samples × n_iter). |
| `--strength` | 0.8 | (img2img only) How much to change the input image. 0.0 = no change, 1.0 = ignore original. |
| `--H` / `--W` | 512 | Output image height / width in pixels. |
| `--precision` | autocast | Use `full` if you see NaN errors on older GPUs. |
| `--plms` | off | Use PLMS sampler instead of DDIM (faster convergence). |
| `--dpm` | off | Use DPM-Solver++ sampler (often best quality). |

### 6. Troubleshoot Common Issues

- **CUDA out of memory** – Reduce `--n_samples` to 1, or use `--precision autocast`.
- **NaN / black images** – Try `--precision full` or lower `--scale`.
- **v-model instability at high guidance** – Normal for base models; use `v2-inference-v.yaml` with 768×768.
- **MiDaS missing** – Download `dpt_hybrid-midas-501f0c75.pt` into `midas_models/`.
- **Slow on CPU** – Add `--device cpu --ipex --bf16` and use Intel-optimized configs.

## Wrap Up

After helping the user run Stable Diffusion, provide a summary:

* Command used and output directory
* Parameters chosen and why
* Any issues encountered and how they were resolved
* Suggestions for next steps (try different seeds, adjust `--scale`, etc.)
