import { useRef } from 'react'
import GameLayer from './game/GameLayer'
import Hero from './sections/Hero'
import About from './sections/About'
import Projects from './sections/Projects'
import Skills from './sections/Skills'
import Contact from './sections/Contact'

export default function App() {
  const heroRef = useRef(null)
  const aboutRef = useRef(null)
  const projectsRef = useRef(null)
  const skillsRef = useRef(null)
  const contactRef = useRef(null)

  return (
    <>
      <GameLayer
        zones={{
          hero: heroRef,
          about: aboutRef,
          projects: projectsRef,
          skills: skillsRef,
          contact: contactRef,
        }}
      />

      <main>
        <section ref={heroRef} id="hero"><Hero /></section>
        <section ref={aboutRef} id="about"><About /></section>
        <section ref={projectsRef} id="projects"><Projects /></section>
        <section ref={skillsRef} id="skills"><Skills /></section>
        <section ref={contactRef} id="contact"><Contact /></section>
      </main>
    </>
  )
}
